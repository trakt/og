import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { collectMedia } from './collectMedia.ts';
import type { WatchTarget } from '../history/WatchTarget.ts';

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
            { name: 'collectedMovies', activity: '', data: new Map([[1, 'old']]) },
            {
              name: 'collectedShows',
              activity: '',
              data: new Map([[5, new Map([[1, new Map([[1, 'old']])], [2, new Map([[1, 'older']])]])]]),
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
    target: { type: 'movie', id: 1, title: 'Movie' } satisfies WatchTarget,
    collectedAt: 'now',
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
describe('collectMedia', () => {
  it.each(['now', 'released', 'unknown', at])('should collect with optional metadata using %s', async (collectedAt) => {
    const params = await setup(true);
    server.use(http.post(`${API}/sync/collection`, async ({ request }) => {
      expect(params.overlay.state('movie', 1).collected).toBe(true);
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 }, collected_at: collectedAt }] });
      return HttpResponse.json({ added: { movies: 1 } }, { status: 201 });
    }));
    expect(await collectMedia({ ...params, collectedAt })).toBe(true);
    expect(params.overlay.state('movie', 1).collectedAt).toBe(
      collectedAt === 'unknown' ? '1970-01-01T00:00:00.000Z' : at,
    );
  });
  it('should change and clear metadata without altering collection dates', async () => {
    const params = await setup();
    const metadata = { media_type: 'bluray', resolution: null, '3d': false };
    server.use(http.post(`${API}/sync/collection`, async ({ request }) => {
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 1 }, ...metadata }] });
      return HttpResponse.json({ updated: { movies: 1 } });
    }));
    expect(await collectMedia({ ...params, collectedAt: undefined, metadata })).toBe(true);
    expect(params.overlay.state('movie', 1)).toMatchObject({ collectedAt: 'old', collectionMetadata: metadata });
  });
  it.each([403, 429, 500])('should roll back metadata and dates after HTTP %s', async (status) => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection`, () => new HttpResponse(null, { status })));
    expect(await collectMedia({ ...params, metadata: { media_type: 'dvd' } })).toBe(false);
    expect(params.overlay.state('movie', 1)).toMatchObject({ collectedAt: 'old', collectionMetadata: undefined });
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
  it.each([null, {}, { not_found: { movies: [{ ids: { trakt: 1 } }] } }])(
    'should roll back malformed and rejected results',
    async (body) => {
      const params = await setup(true);
      server.use(http.post(`${API}/sync/collection`, () => HttpResponse.json(body)));
      expect(await collectMedia(params)).toBe(false);
      expect(params.overlay.state('movie', 1).collected).toBeUndefined();
    },
  );
  it('should add only the remaining aired episodes', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection`, async ({ request }) => {
      expect(params.overlay.state('show', 5).collectedEpisodes).toBe(3);
      expect(await request.json()).toEqual({ episodes: [{ ids: { trakt: 11 }, collected_at: 'now', hdr: 'hdr10' }] });
      return HttpResponse.json({ added: { episodes: 1 } });
    }));
    expect(
      await collectMedia({ ...params, target: { type: 'show', id: 5, title: 'Show' }, metadata: { hdr: 'hdr10' } }),
    ).toBe(true);
  });
  it('should force recollection and patch both episode ids and episode numbers', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection`, async ({ request }) => {
      expect(await request.json()).toEqual({
        episodes: [10, 11].map((id) => ({ ids: { trakt: id }, collected_at: 'now' })),
      });
      return HttpResponse.json({ updated: { episodes: 1 }, added: { episodes: 1 } });
    }));
    expect(
      await collectMedia({
        ...params,
        force: true,
        target: { type: 'season', id: 7, title: 'Season', season: { show: 5, number: 1 } },
      }),
    ).toBe(true);
    expect(params.overlay.state('episode', 10).collected).toBe(true);
    expect(params.overlay.state('episode', 11, { show: 5, number: 1, episode: 2 }).collected).toBe(true);
  });
  it('should update only collected episodes for a metadata-only show edit', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection`, async ({ request }) => {
      expect(await request.json()).toEqual({ episodes: [{ ids: { trakt: 10 }, media_type: 'dvd' }] });
      return HttpResponse.json({ updated: { episodes: 1 } });
    }));
    expect(
      await collectMedia({
        ...params,
        collectedAt: undefined,
        metadata: { media_type: 'dvd' },
        target: { type: 'show', id: 5, title: 'Show' },
      }),
    ).toBe(true);
    expect(params.overlay.state('show', 5).collectedEpisodes).toBe(2);
  });
  it.each(['movie', 'show', 'season'] as const)('should remove a %s and leave other seasons alone', async (type) => {
    const params = await setup();
    const target: WatchTarget = { type, id: type === 'movie' ? 1 : 5, title: 'Item', season: { show: 5, number: 1 } };
    server.use(http.post(`${API}/sync/collection/remove`, async ({ request }) => {
      expect(await request.json()).toEqual({ [`${type}s`]: [{ ids: { trakt: target.id } }] });
      return HttpResponse.json({ deleted: { movies: 1, episodes: 1 } });
    }));
    expect(await collectMedia({ ...params, target, collectedAt: null })).toBe(true);
    expect(params.overlay.state(type, target.id, target.season).collected).toBe(false);
    if (type === 'season') expect(params.overlay.state('show', 5).collectedEpisodes).toBe(1);
  });
  it('should resolve an episode and remove its number from its parent collection', async () => {
    const params = await setup();
    server.use(
      http.get(
        `${API}/search/trakt/10`,
        () => HttpResponse.json([{ show: { ids: { trakt: 5 } }, episode: { season: 1, number: 1 } }]),
      ),
    );
    server.use(http.post(`${API}/sync/collection/remove`, () => HttpResponse.json({ deleted: { episodes: 1 } })));
    expect(await collectMedia({ ...params, target: { type: 'episode', id: 10, title: 'Episode' }, collectedAt: null }))
      .toBe(true);
    expect(params.overlay.state('episode', 10, { show: 5, number: 1, episode: 1 }).collected).toBe(false);
  });
  it('should not write when no aired episodes or progress is available', async () => {
    const params = await setup();
    expect(
      await collectMedia({
        ...params,
        target: { type: 'show', id: 5, title: 'Show' },
        episodes: () => Promise.resolve([]),
      }),
    ).toBe(false);
    expect(
      await collectMedia({
        ...params,
        target: { type: 'show', id: 5, title: 'Show' },
        episodes: () => Promise.reject(new Error('403')),
      }),
    ).toBe(false);
    expect(params.overlay.state('show', 5).collectedEpisodes).toBe(2);
  });
  it('should remove an episode with page context without a search request', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection/remove`, async ({ request }) => {
      expect(await request.json()).toEqual({ episodes: [{ ids: { trakt: 10 } }] });
      expect(params.overlay.state('episode', 10, { show: 5, number: 1, episode: 1 }).collected).toBe(false);
      expect(params.overlay.state('episode', 20, { show: 5, number: 2, episode: 1 }).collected).toBe(true);
      return HttpResponse.json({ deleted: { episodes: 1 } });
    }));
    expect(
      await collectMedia({
        ...params,
        collectedAt: null,
        target: { type: 'episode', id: 10, title: 'Pilot', season: { show: 5, number: 1, episode: 1 } },
      }),
    ).toBe(true);
  });
  it('should roll back and toast a rate-limited removal', async () => {
    const params = await setup();
    server.use(http.post(`${API}/sync/collection/remove`, () => new HttpResponse(null, { status: 429 })));
    expect(await collectMedia({ ...params, collectedAt: null })).toBe(false);
    expect(params.overlay.state('movie', 1).collected).toBe(true);
    expect(params.notify.error).toHaveBeenCalledOnce();
  });
});
