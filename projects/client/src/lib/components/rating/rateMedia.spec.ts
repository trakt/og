import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { SliceRecord } from '../../overlay/overlayStorage.ts';
import { rateMedia } from './rateMedia.ts';
import type { RatingTarget } from './RatingTarget.ts';

const API = 'https://apiz.trakt.tv';
const target: RatingTarget = { type: 'movie', id: 1, title: 'Fight Club' };
const now = () => new Date('2026-09-29T12:00:00.000Z');
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function setup({ unknown = false, watched = false } = {}) {
  const records: SliceRecord[] = unknown ? [] : [
    {
      name: 'ratings',
      activity: '',
      data: { movie: new Map([[1, 8]]), show: new Map(), season: new Map(), episode: new Map() },
    },
    { name: 'watchedMovies', activity: '', data: watched ? new Map([[1, ['d']]]) : new Map() },
    { name: 'watchedShows', activity: '', data: new Map() },
  ];
  const overlay = createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: {
      load: () => Promise.resolve(records),
      save: () => Promise.resolve(),
      clearExcept: () => Promise.resolve(),
    },
  });
  await overlay.start('tester');
  const notify = { success: vi.fn(), error: vi.fn() };
  const request = (path: string, body?: unknown) =>
    rawApiFetch({
      path,
      init: body === undefined ? undefined : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    });
  return { overlay, notify, request, target, now };
}

function ratingResponse(body: { not_found?: Record<string, { ids: { trakt: number } }[]> } = {}) {
  server.use(http.post(`${API}/sync/ratings`, () => HttpResponse.json(body, { status: 201 })));
}

describe('rateMedia', () => {
  it.each(['movie', 'show', 'season', 'episode'] as const)(
    'should rate a %s and patch its shared overlay before the response',
    async (type) => {
      const params = await setup();
      server.use(http.post(`${API}/sync/ratings`, async ({ request }) => {
        expect(params.overlay.state(type, 1).rating).toBe(9);
        expect(await request.json()).toEqual({ [`${type}s`]: [{ ids: { trakt: 1 }, rating: 9 }] });
        return HttpResponse.json({ added: { [`${type}s`]: 1 } }, { status: 201 });
      }));
      expect(await rateMedia({ ...params, target: { ...target, type }, rating: 9 })).toBe(true);
      expect(params.overlay.state(type, 1).rating).toBe(9);
    },
  );

  it('should remove the current rating without adding history', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/ratings/remove`, async ({ request }) => {
      expect(params.overlay.state('movie', 1).rating).toBeNull();
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 } }] });
      return HttpResponse.json({ deleted: { movies: 1 } });
    }));
    expect(await rateMedia({ ...params, rating: null, watchAfterRating: 'now' })).toBe(true);
    expect(params.notify.success).toHaveBeenCalledOnce();
  });

  it.each([403, 429, 500])('should roll back failed ratings (%s)', async (status) => {
    const params = await setup();
    server.use(http.post(`${API}/sync/ratings`, () => new HttpResponse(null, { status })));
    expect(await rateMedia({ ...params, rating: 9 })).toBe(false);
    expect(params.overlay.state('movie', 1).rating).toBe(8);
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });

  it('should roll back HTTP success when the API could not find the item', async () => {
    const params = await setup();
    ratingResponse({ not_found: { movies: [{ ids: { trakt: 1 } }] } });
    expect(await rateMedia({ ...params, rating: 9 })).toBe(false);
    expect(params.overlay.state('movie', 1).rating).toBe(8);
  });

  it('should restore unknown state after a network failure', async () => {
    const params = await setup({ unknown: true });
    server.use(http.post(`${API}/sync/ratings`, () => HttpResponse.error()));
    expect(await rateMedia({ ...params, rating: 9 })).toBe(false);
    expect(params.overlay.state('movie', 1).rating).toBeUndefined();
  });

  it('should show a saved rating even before the ratings cache is available', async () => {
    const params = await setup({ unknown: true });
    ratingResponse();
    await rateMedia({ ...params, rating: 9 });
    expect(params.overlay.state('movie', 1).rating).toBe(9);
  });

  it.each(['now', 'released', 'unknown'])(
    'should auto-watch an unwatched movie using the %s preference',
    async (mode) => {
      const params = await setup();
      ratingResponse();
      server.use(http.post(`${API}/sync/history`, async ({ request }) => {
        expect(params.overlay.state('movie', 1).watched).toBe(true);
        expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 }, watched_at: mode }] });
        return HttpResponse.json({ added: { movies: 1 } }, { status: 201 });
      }));
      expect(await rateMedia({ ...params, rating: 9, watchAfterRating: mode })).toBe(true);
      expect(params.overlay.state('movie', 1).plays).toBe(1);
      expect(params.notify.error).not.toHaveBeenCalled();
    },
  );

  it('should retain a saved rating and roll back history when auto-watch fails', async () => {
    const params = await setup();
    ratingResponse();
    server.use(http.post(`${API}/sync/history`, () => new HttpResponse(null, { status: 500 })));
    expect(await rateMedia({ ...params, rating: 9, watchAfterRating: 'now' })).toBe(true);
    expect(params.overlay.state('movie', 1)).toMatchObject({ rating: 9, watched: false, plays: 0 });
    expect(params.notify.error).toHaveBeenCalledWith(expect.stringContaining('rating was saved'));
  });

  it('should not add another play to an already watched movie', async () => {
    const params = await setup({ watched: true });
    ratingResponse();
    await rateMedia({ ...params, rating: 9, watchAfterRating: 'now' });
    expect(params.overlay.state('movie', 1).plays).toBe(1);
    expect(params.notify.error).not.toHaveBeenCalled();
  });

  it('should check history when watched state is unknown', async () => {
    const params = await setup({ unknown: true });
    ratingResponse();
    const history = vi.fn(() => HttpResponse.json([{ id: 100 }]));
    server.use(http.get(`${API}/sync/history/movies/1`, history));
    await rateMedia({ ...params, rating: 9, watchAfterRating: 'now' });
    expect(history).toHaveBeenCalledOnce();
    expect(params.notify.error).not.toHaveBeenCalled();
  });

  it('should add an episode to its show and season and skip a second auto-watch', async () => {
    const params = await setup();
    ratingResponse();
    server.use(http.get(`${API}/search/trakt/1`, () =>
      HttpResponse.json([
        { episode: { season: 2 }, show: { ids: { trakt: 5 } } },
      ])));
    const history = vi.fn(() => HttpResponse.json({}, { status: 201 }));
    server.use(http.post(`${API}/sync/history`, history));
    const episodeParams = {
      ...params,
      target: { ...target, type: 'episode' as const },
      rating: 9,
      watchAfterRating: 'now',
    };
    await rateMedia(episodeParams);
    expect(params.overlay.state('episode', 1).watched).toBe(true);
    expect(params.overlay.state('show', 5).watchedEpisodes).toBe(1);
    expect(params.overlay.state('season', 10, { show: 5, number: 2 }).watchedEpisodes).toBe(1);
    await rateMedia(episodeParams);
    expect(history).toHaveBeenCalledOnce();
  });
});
