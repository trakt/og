import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { createOverlay } from '../overlay/createOverlay.svelte.ts';
import { toggleFavorite } from './toggleFavorite.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const now = () => new Date('2026-09-29T12:00:00Z');
async function setup(unknown = false) {
  const overlay = createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: {
      load: () =>
        Promise.resolve(
          unknown ? [] : [{ name: 'favorites' as const, activity: '', data: { movie: new Set(), show: new Set() } }],
        ),
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
  return { overlay, notify, request, now };
}

describe('toggleFavorite', () => {
  it.each(['movie', 'show'] as const)(
    'should favorite a %s optimistically and return its list-item id and existing notes',
    async (type) => {
      const params = await setup();
      server.use(
        http.post(`${API}/sync/favorites`, async ({ request }) => {
          expect(params.overlay.state(type, 1)).toMatchObject({ favorited: true, favoritedAt: now().toISOString() });
          expect(await request.json()).toEqual({ [`${type}s`]: [{ ids: { trakt: 1 } }] });
          return HttpResponse.json({ added: { movies: 1, shows: 1 }, not_found: {} }, { status: 201 });
        }),
        http.get(
          `${API}/sync/favorites`,
          () => HttpResponse.json([{ type, [type]: { ids: { trakt: 1 } }, id: 42, notes: 'Worth revisiting' }]),
        ),
      );
      expect(await toggleFavorite({ ...params, target: { type, id: 1, title: 'Favorite' }, remove: false })).toEqual({
        id: 42,
        notes: 'Worth revisiting',
      });
      expect(params.notify.success).toHaveBeenCalledWith('Added Favorite to your favorites.');
    },
  );
  it('should remove immediately without reading notes or opening a prompt', async () => {
    const params = await setup();
    params.overlay.patch(
      'favorites',
      (f) => ({ ...f, movie: new Set([1]), dates: { movie: new Map([[1, now().toISOString()]]), show: new Map() } }),
    );
    server.use(http.post(`${API}/sync/favorites/remove`, () => {
      expect(params.overlay.state('movie', 1)).toMatchObject({ favorited: false, favoritedAt: undefined });
      return HttpResponse.json({ deleted: { movies: 1, shows: 0 }, not_found: {} });
    }));
    expect(await toggleFavorite({ ...params, target: { type: 'movie', id: 1, title: 'Movie' }, remove: true }))
      .toBeNull();
    expect(params.notify.error).not.toHaveBeenCalled();
  });
  it.each([403, 420, 429, 500])('should roll back failure %s and suppress rate-limit toasts', async (status) => {
    const params = await setup(true);
    server.use(http.post(`${API}/sync/favorites`, () => HttpResponse.json({ message: 'Account limit' }, { status })));
    expect(await toggleFavorite({ ...params, target: { type: 'show', id: 1, title: 'Show' }, remove: false }))
      .toBeNull();
    expect(params.overlay.state('show', 1).favorited).toBeUndefined();
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
  it.each([{ added: { movies: 0, shows: 0 }, not_found: { movies: [{}] } }, { nonsense: true }])(
    'should roll back unsuccessful or malformed success bodies',
    async (result) => {
      const params = await setup();
      server.use(http.post(`${API}/sync/favorites`, () => HttpResponse.json(result, { status: 201 })));
      await toggleFavorite({ ...params, target: { type: 'movie', id: 1, title: 'Movie' }, remove: false });
      expect(params.overlay.state('movie', 1).favorited).toBe(false);
      expect(params.notify.error).toHaveBeenCalledOnce();
    },
  );
  it('should keep a saved favorite when the notes lookup fails', async () => {
    const params = await setup(true);
    server.use(
      http.post(`${API}/sync/favorites`, () => HttpResponse.json({ added: { movies: 1, shows: 0 } }, { status: 201 })),
      http.get(`${API}/sync/favorites`, () => new HttpResponse(null, { status: 503 })),
    );
    await toggleFavorite({ ...params, target: { type: 'movie', id: 1, title: 'Movie' }, remove: false });
    expect(params.overlay.state('movie', 1).favorited).toBe(true);
    expect(params.notify.error).toHaveBeenCalledWith(expect.stringContaining('favorite was saved'));
  });
  it('should restore an existing favorite and its date when removal fails', async () => {
    const params = await setup();
    params.overlay.patch(
      'favorites',
      (f) => ({ ...f, movie: new Set([1]), dates: { movie: new Map([[1, now().toISOString()]]), show: new Map() } }),
    );
    server.use(http.post(`${API}/sync/favorites/remove`, () => HttpResponse.error()));
    await toggleFavorite({ ...params, target: { type: 'movie', id: 1, title: 'Movie' }, remove: true });
    expect(params.overlay.state('movie', 1)).toMatchObject({ favorited: true, favoritedAt: now().toISOString() });
  });
  it('should restore the server date when an unknown favorite already exists', async () => {
    const params = await setup(true);
    server.use(
      http.post(
        `${API}/sync/favorites`,
        () => HttpResponse.json({ added: { movies: 0, shows: 0 }, existing: { movies: 1, shows: 0 } }, { status: 201 }),
      ),
      http.get(`${API}/sync/favorites`, () =>
        HttpResponse.json([{
          type: 'movie',
          movie: { ids: { trakt: 1 } },
          id: 42,
          listed_at: '2020-01-01T00:00:00Z',
          notes: 'Keep me',
        }])),
    );
    expect(await toggleFavorite({ ...params, target: { type: 'movie', id: 1, title: 'Movie' }, remove: false }))
      .toEqual({ id: 42, notes: 'Keep me' });
    expect(params.overlay.state('movie', 1).favoritedAt).toBe('2020-01-01T00:00:00Z');
  });
});
