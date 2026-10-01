import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { watchMedia } from './watchMedia.ts';
import type { WatchTarget } from './WatchTarget.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const at = '2026-09-29T12:00:00.000Z';
const episodes = [
  { id: 10, show: 5, season: 1, number: 1, completed: true },
  { id: 11, show: 5, season: 1, number: 2, completed: false },
];
async function setup(unknown = false) {
  const overlay = createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: {
      load: () =>
        Promise.resolve(
          unknown ? [] : [
            { name: 'watchedMovies', activity: '', data: new Map([[1, ['2026-01-01T00:00:00Z']]]) },
            {
              name: 'watchedShows',
              activity: '',
              data: new Map([[5, new Map([[1, new Map([[10, ['old']]])], [2, new Map([[20, ['old']]])]])]]),
            },
          ],
        ),
      save: () => Promise.resolve(),
      clearExcept: () => Promise.resolve(),
    },
  });
  await overlay.start('tester');
  return {
    overlay,
    target: { type: 'movie', id: 1, title: 'Fight Club' } satisfies WatchTarget,
    watchedAt: 'now',
    now: () => new Date(at),
    episodes: () => Promise.resolve(episodes),
    notify: { success: vi.fn(), error: vi.fn() },
    request: (path: string, body?: unknown) =>
      rawApiFetch({
        path,
        init: body === undefined ? undefined : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      }),
  };
}
describe('watchMedia', () => {
  it.each(['now', 'released', 'unknown', at])('should add another movie play using %s', async (watchedAt) => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history`, async ({ request }) => {
      expect(params.overlay.state('movie', 1).plays).toBe(2);
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 }, watched_at: watchedAt }] });
      return HttpResponse.json({ added: { movies: 1 } }, { status: 201 });
    }));
    expect(await watchMedia({ ...params, watchedAt })).toBe(true);
    expect(params.overlay.state('movie', 1).plays).toBe(2);
  });
  it.each([403, 429, 500])('should restore every prior play on HTTP failure %s', async (status) => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history`, () => new HttpResponse(null, { status })));
    expect(await watchMedia(params)).toBe(false);
    expect(params.overlay.state('movie', 1).plays).toBe(1);
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
  it.each([{}, { not_found: { movies: [{ ids: { trakt: 1 } }] } }])(
    'should handle a successful or missing-item removal',
    async (body) => {
      const params = await setup();
      server.use(http.post(`${API}/sync/history/remove`, async ({ request }) => {
        expect(params.overlay.state('movie', 1).watched).toBe(false);
        expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 } }] });
        return HttpResponse.json(body);
      }));
      expect(await watchMedia({ ...params, watchedAt: null })).toBe(!('not_found' in body));
      expect(params.overlay.state('movie', 1).plays).toBe('not_found' in body ? 1 : 0);
    },
  );
  it('should restore unknown state after a network failure', async () => {
    const params = await setup(true);
    server.use(http.post(`${API}/sync/history`, () => HttpResponse.error()));
    expect(await watchMedia(params)).toBe(false);
    expect(params.overlay.state('movie', 1).watched).toBeUndefined();
  });
  it('should display saved history when the cache was unavailable', async () => {
    const params = await setup(true);
    server.use(http.post(`${API}/sync/history`, () => HttpResponse.json({ added: { movies: 1 } })));
    await watchMedia(params);
    expect(params.overlay.state('movie', 1)).toMatchObject({ watched: true, plays: 1, lastWatchedAt: at });
  });
  it.each([false, true])('should watch only remaining episodes unless forced (%s)', async (force) => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history`, async ({ request }) => {
      expect(await request.json()).toEqual({
        episodes: (force ? episodes : episodes.slice(1)).map(({ id }) => ({ ids: { trakt: id }, watched_at: 'now' })),
      });
      expect(params.overlay.state('show', 5).watchedEpisodes).toBe(3);
      return HttpResponse.json({ added: { episodes: force ? 2 : 1 } });
    }));
    await watchMedia({ ...params, target: { type: 'show', id: 5, title: 'Breaking Bad' }, force });
    expect(params.overlay.state('season', 99, { show: 5, number: 1 })).toMatchObject({
      watchedEpisodes: 2,
      watchedPlays: force ? 3 : 2,
    });
  });
  it('should remove a season while retaining other seasons', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history/remove`, async ({ request }) => {
      expect(await request.json()).toEqual({ seasons: [{ ids: { trakt: 99 } }] });
      return HttpResponse.json({ deleted: { episodes: 1 } });
    }));
    await watchMedia({
      ...params,
      target: { type: 'season', id: 99, title: 'Season 1', season: { show: 5, number: 1 } },
      watchedAt: null,
    });
    expect(params.overlay.state('show', 5).watchedEpisodes).toBe(1);
    expect(params.overlay.state('episode', 10).watched).toBe(false);
    expect(params.overlay.state('episode', 20).watched).toBe(true);
  });
  it('should remove an entire show and roll it back if the response is malformed', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history/remove`, () => HttpResponse.json({ deleted: 'invalid' })));
    expect(await watchMedia({ ...params, target: { type: 'show', id: 5, title: 'Breaking Bad' }, watchedAt: null }))
      .toBe(false);
    expect(params.overlay.state('show', 5).watchedEpisodes).toBe(2);
  });
  it('should patch episode, season and show together', async () => {
    const params = await setup();
    server.use(
      http.get(
        `${API}/search/trakt/11`,
        () =>
          HttpResponse.json([{ show: { ids: { trakt: 5 } }, episode: { ids: { trakt: 11 }, season: 1, number: 2 } }]),
      ),
    );
    server.use(http.post(`${API}/sync/history`, () => HttpResponse.json({ added: { episodes: 1 } })));
    await watchMedia({ ...params, target: { type: 'episode', id: 11, title: 'Episode 2' } });
    expect(params.overlay.state('episode', 11)).toMatchObject({ watched: true, plays: 1 });
    expect(params.overlay.state('show', 5).watchedEpisodes).toBe(3);
  });
  it('should reject an empty aired selection without writing', async () => {
    const params = await setup();
    expect(
      await watchMedia({
        ...params,
        target: { type: 'show', id: 5, title: 'Breaking Bad' },
        episodes: () => Promise.resolve([]),
      }),
    ).toBe(false);
    expect(params.notify.error).toHaveBeenCalledWith('Doh! No aired episodes were found to watch.');
    expect(params.overlay.state('show', 5).watchedEpisodes).toBe(2);
  });
  it('should remove one history id and retain another play at the same instant', async () => {
    const params = await setup();
    params.overlay.patch(
      'watchedMovies',
      () => new Map([[1, ['2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00Z', at]]]),
    );
    server.use(http.post(`${API}/sync/history/remove`, async ({ request }) => {
      expect(await request.json()).toEqual({ ids: [900] });
      expect(params.overlay.state('movie', 1).plays).toBe(2);
      return HttpResponse.json({ deleted: { movies: 1 }, not_found: { ids: [] } });
    }));
    expect(await watchMedia({ ...params, watchedAt: null, play: { id: 900, watchedAt: '2026-01-01T00:00:00Z' } })).toBe(
      true,
    );
    expect(params.overlay.state('movie', 1).watched).toBe(true);
    expect(params.notify.success).toHaveBeenCalledWith('You removed this play of Fight Club.');
  });
  it('should remove an episode play using its page context and keep the other episode plays', async () => {
    const params = await setup();
    params.overlay.patch(
      'watchedShows',
      () => new Map([[5, new Map([[1, new Map([[10, [at, '2026-01-01T00:00:00Z']], [11, [at]]])]])]]),
    );
    server.use(http.post(`${API}/sync/history/remove`, async ({ request }) => {
      expect(await request.json()).toEqual({ ids: [901] });
      expect(params.overlay.state('episode', 10).plays).toBe(1);
      expect(params.overlay.state('episode', 11).plays).toBe(1);
      return HttpResponse.json({ deleted: { episodes: 1 } });
    }));
    expect(
      await watchMedia({
        ...params,
        watchedAt: null,
        play: { id: 901, watchedAt: at },
        target: { type: 'episode', id: 10, title: 'Pilot', season: { show: 5, number: 1, episode: 1 } },
      }),
    ).toBe(true);
  });
  it.each([500, 200])(
    'should restore a play when removal fails or its history id is missing (HTTP %s)',
    async (status) => {
      const params = await setup();
      server.use(
        http.post(
          `${API}/sync/history/remove`,
          () => HttpResponse.json({ deleted: { movies: 0 }, not_found: { ids: [900] } }, { status }),
        ),
      );
      expect(await watchMedia({ ...params, watchedAt: null, play: { id: 900, watchedAt: '2026-01-01T00:00:00Z' } }))
        .toBe(false);
      expect(params.overlay.state('movie', 1).plays).toBe(1);
      expect(params.notify.error).toHaveBeenCalledOnce();
    },
  );
  it('should leave unknown whole-library state unknown after removing a single play', async () => {
    const params = await setup(true);
    server.use(http.post(`${API}/sync/history/remove`, () => HttpResponse.json({ deleted: { movies: 1 } })));
    expect(await watchMedia({ ...params, watchedAt: null, play: { id: 900, watchedAt: at } })).toBe(true);
    expect(params.overlay.state('movie', 1).watched).toBeUndefined();
  });
  it.each([{}, { deleted: { movies: 0 } }])(
    'should restore the overlay when no play was confirmed deleted',
    async (body) => {
      const params = await setup();
      server.use(http.post(`${API}/sync/history/remove`, () => HttpResponse.json(body)));
      expect(await watchMedia({ ...params, watchedAt: null, play: { id: 900, watchedAt: '2026-01-01T00:00:00Z' } }))
        .toBe(false);
      expect(params.overlay.state('movie', 1).plays).toBe(1);
      expect(params.notify.success).not.toHaveBeenCalled();
    },
  );
  it('should use the API message when it supplies one', async () => {
    const params = await setup();
    server.use(
      http.post(
        `${API}/sync/history/remove`,
        () => HttpResponse.json({ deleted: { movies: 1 }, message: 'Play removed.' }),
      ),
    );
    expect(await watchMedia({ ...params, watchedAt: null, play: { id: 900, watchedAt: '2026-01-01T00:00:00Z' } })).toBe(
      true,
    );
    expect(params.notify.success).toHaveBeenCalledWith('Play removed.');
  });
  it('should roll back and toast a rate-limited removal', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/history/remove`, () => new HttpResponse(null, { status: 429 })));
    expect(await watchMedia({ ...params, watchedAt: null })).toBe(false);
    expect(params.overlay.state('movie', 1).plays).toBe(1);
    expect(params.notify.error).toHaveBeenCalledOnce();
  });
});
