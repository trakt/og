import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { workerUnauthorized } from '../api/workerUnauthorized.ts';
import { createOverlay } from './createOverlay.svelte.ts';
import type { OverlayStorage, SliceRecord } from './overlayStorage.ts';

const API = 'https://apiz.trakt.tv';
const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';
const ids = (trakt: number) => ({ ids: { trakt } });

const requests: string[] = [];
const activities = (droppedAt = T0) => ({
  all: T0,
  movies: { watched_at: T0, collected_at: T0, rated_at: T0, watchlisted_at: T0, favorited_at: T0 },
  episodes: { watched_at: T0, collected_at: T0, rated_at: T0 },
  shows: { rated_at: T0, watchlisted_at: T0, favorited_at: T0, hidden_at: T0, dropped_at: droppedAt },
  seasons: { rated_at: T0 },
  lists: { updated_at: T0 },
  watchlist: { updated_at: T0 },
  favorites: { updated_at: T0 },
  collaborations: { updated_at: T0 },
});

const library = [
  http.get(`${API}/sync/last_activities`, () => HttpResponse.json(activities())),
  http.get(`${API}/sync/watched/movies`, () => HttpResponse.json({ '1': ['2026-01-02', '2026-01-01'] })),
  http.get(
    `${API}/sync/watched/shows`,
    () => HttpResponse.json({ '2': { '10|0': { '100': ['d'] }, '11|1': { '101': ['d'], '102': ['d', 'd'] } } }),
  ),
  http.get(`${API}/users/hidden/progress_watched_reset`, () => HttpResponse.json([{ type: 'show', show: ids(2) }])),
  http.get(`${API}/sync/collection/movies`, () => HttpResponse.json([{ movie: ids(1), collected_at: T0 }])),
  http.get(
    `${API}/sync/collection/shows`,
    () => HttpResponse.json([{ show: ids(2), seasons: [{ number: 1, episodes: [{ number: 1, collected_at: T0 }] }] }]),
  ),
  http.get(`${API}/sync/ratings`, () => HttpResponse.json([{ type: 'movie', rating: 9, movie: ids(1) }])),
  http.get(`${API}/sync/watchlist/seasons/rank/asc`, () => HttpResponse.json([{ season: ids(3) }])),
  http.get(`${API}/sync/watchlist/episodes/rank/asc`, () => HttpResponse.json([{ episode: ids(4) }])),
  http.get(`${API}/v3/users/me/watchlist/minimal`, () => HttpResponse.json({ movies: [], shows: [2] })),
  http.get(
    `${API}/sync/favorites`,
    () => HttpResponse.json([{ type: 'movie', movie: ids(1), id: 10, listed_at: '2026-09-29T12:00:00Z' }]),
  ),
  http.get(`${API}/users/hidden/dropped`, () => HttpResponse.json([{ type: 'show', show: ids(2) }])),
  http.get(`${API}/users/hidden/progress_watched`, () => HttpResponse.json([{ type: 'show', show: ids(5) }])),
  http.get(`${API}/users/hidden/progress_collected`, () => HttpResponse.json([])),
  http.get(`${API}/v3/users/me/lists`, () => HttpResponse.json([{ id: 50 }])),
  http.get(
    `${API}/lists/50/items`,
    () => HttpResponse.json([{ type: 'movie', movie: ids(1), id: 10, listed_at: '2026-09-29T12:00:00Z' }]),
  ),
];

const server = setupServer(...library);
server.events.on('request:start', ({ request }) => requests.push(new URL(request.url).pathname));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

function fakeStorage(seed: Record<string, SliceRecord[]> = {}) {
  const records = new Map(Object.entries(seed).map(([user, list]) => [user, new Map(list.map((r) => [r.name, r]))]));
  const storage: OverlayStorage = {
    load: (user) => Promise.resolve([...(records.get(user)?.values() ?? [])]),
    save: (user, record) => {
      records.set(user, (records.get(user) ?? new Map()).set(record.name, record));
      return Promise.resolve();
    },
    clearExcept: (user) => {
      [...records.keys()].filter((key) => key !== user).forEach((key) => records.delete(key));
      return Promise.resolve();
    },
  };
  return { storage, records };
}

const setup = (seed?: Record<string, SliceRecord[]>, now = () => 0) => {
  const { storage, records } = fakeStorage(seed);
  const overlay = createOverlay({ get: (path) => rawApiFetch({ path, token: 't' }), storage, now });
  return { overlay, records };
};

const droppedRecord = (activity: string, id: number): SliceRecord => ({
  name: 'dropped',
  activity: `${activity}|dates-v1`,
  data: new Set([id]),
});

describe('createOverlay', () => {
  it('should report every field as unknown before sign-in', () => {
    const { overlay } = setup();

    expect(Object.values(overlay.state('movie', 1)).every((value) => value === undefined)).toBe(true);
    expect(Object.values(overlay.state('show', 2)).every((value) => value === undefined)).toBe(true);
  });

  it('should fetch every slice on a cold start and cache it', async () => {
    const { overlay, records } = setup();

    await overlay.start('sean');
    expect(overlay.state('season', 3).watchlisted).toBe(true);
    expect(overlay.state('episode', 4).watchlisted).toBe(true);
    expect(overlay.watchlistCount()).toBe(3);

    expect(overlay.state('movie', 1)).toEqual({
      rating: 9,
      listed: true,
      watchlisted: false,
      favorited: true,
      favoritedAt: '2026-09-29T12:00:00Z',
      plays: 2,
      watchedPlays: 2,
      lastWatchedAt: '2026-01-02',
      watched: true,
      collected: true,
      collectedAt: T0,
    });
    expect(overlay.state('show', 2)).toMatchObject({
      watchedEpisodes: 2,
      watched: true,
      collectedEpisodes: 1,
      watchlisted: true,
      dropped: true,
      rewatching: true,
      rating: null,
    });
    expect(overlay.slices().progressHidden?.watched.shows).toEqual(new Set([5]));
    expect(records.get('sean')?.size).toBe(11);
  });

  it('should hydrate an episode collection by show, season and episode number, including old date-only caches', async () => {
    const { overlay } = setup();
    await overlay.start('sean');
    expect(overlay.state('episode', 101, { show: 2, number: 1, episode: 1 })).toMatchObject({
      collected: true,
      collectedAt: T0,
    });
    expect(overlay.state('episode', 102, { show: 2, number: 1, episode: 2 }).collected).toBe(false);
  });

  describe('for seasons', () => {
    it('should count one season of its show, specials included', async () => {
      const { overlay } = setup();
      await overlay.start('sean');

      expect(overlay.state('season', 11, { show: 2, number: 1 })).toMatchObject({
        watchedEpisodes: 2,
        watched: true,
        collectedEpisodes: 1,
        rewatching: true,
      });
      expect(overlay.state('season', 10, { show: 2, number: 0 }).watchedEpisodes).toBe(1);
      expect(overlay.state('season', 12, { show: 2, number: 2 })).toMatchObject({ watched: false, collected: false });
    });

    it('should leave progress out without the show', async () => {
      const { overlay } = setup();
      await overlay.start('sean');

      expect(overlay.state('season', 11)).toEqual({ rating: null, listed: false, watchlisted: false });
    });
  });

  describe('for episodes', () => {
    it('should read library membership from the supplied show, season and episode number', async () => {
      const { overlay } = setup();
      expect(overlay.state('episode', 101, { show: 2, number: 1, episode: 1 }).collected).toBeUndefined();
      await overlay.start('sean');
      expect(overlay.state('episode', 101, { show: 2, number: 1, episode: 1 })).toMatchObject({
        collected: true,
        collectedAt: T0,
      });
      expect(overlay.state('episode', 102, { show: 2, number: 1, episode: 2 }).collected).toBe(false);
      expect(overlay.state('episode', 103, { show: 3, number: 1, episode: 1 }).collected).toBe(false);
      expect(overlay.state('episode', 101).collected).toBeUndefined();
    });

    it('should give watched state and plays, with or without its season', async () => {
      const { overlay } = setup();
      await overlay.start('sean');

      expect(overlay.state('episode', 102, { show: 2, number: 1 })).toMatchObject({ watched: true, plays: 2 });
      expect(overlay.state('episode', 103, { show: 2, number: 1 })).toMatchObject({ watched: false, plays: 0 });
      expect(overlay.state('episode', 102)).toMatchObject({ watched: true, plays: 2 });
      expect(overlay.state('episode', 103)).toMatchObject({ watched: false, plays: 0 });
    });
  });

  it('should fetch lists after every other slice', async () => {
    const { overlay } = setup();

    await overlay.start('sean');

    const firstListRequest = requests.indexOf('/v3/users/me/lists');
    expect(requests.slice(firstListRequest)).toEqual(['/v3/users/me/lists', '/lists/50/items']);
  });

  it('should use cached slices whose timestamps did not move', async () => {
    const { overlay } = setup({ sean: [droppedRecord(T0, 99)] });

    await overlay.start('sean');

    expect(requests).not.toContain('/users/hidden/dropped');
    expect(overlay.state('show', 99).dropped).toBe(true);
  });

  it('should refetch a cached slice whose timestamp moved', async () => {
    server.use(http.get(`${API}/sync/last_activities`, () => HttpResponse.json(activities(T1))));
    const { overlay } = setup({ sean: [droppedRecord(T0, 99)] });

    await overlay.start('sean');

    expect(overlay.state('show', 99).dropped).toBe(false);
    expect(overlay.state('show', 2).dropped).toBe(true);
  });

  describe('when last_activities fails', () => {
    it('should keep the cached slices and fetch nothing else', async () => {
      server.use(http.get(`${API}/sync/last_activities`, () => HttpResponse.json({}, { status: 502 })));
      const { overlay } = setup({ sean: [droppedRecord('old', 99)] });

      await overlay.start('sean');

      expect(requests).toEqual(['/sync/last_activities']);
      expect(overlay.state('show', 99).dropped).toBe(true);
      expect(overlay.state('movie', 1).watched).toBeUndefined();
    });
  });

  describe('when the token stopped working', () => {
    it("should resolve its first sync on the worker's plain-text 401, keeping the cache", async () => {
      server.use(http.get(`${API}/sync/last_activities`, () => workerUnauthorized()));
      const { overlay } = setup({ sean: [droppedRecord('old', 99)] });

      await overlay.start('sean');

      expect(requests).toEqual(['/sync/last_activities']);
      expect(overlay.state('show', 99).dropped).toBe(true);
    });

    it('should leave a slice that answers it unknown and apply the others', async () => {
      server.use(http.get(`${API}/sync/watched/movies`, () => workerUnauthorized()));
      const { overlay } = setup();

      await overlay.start('sean');

      expect(overlay.state('movie', 1).watched).toBeUndefined();
      expect(overlay.state('show', 2).dropped).toBe(true);
    });
  });

  describe('when one slice fails', () => {
    it('should keep its previous copy and apply the others', async () => {
      server.use(http.get(`${API}/users/hidden/dropped`, () => HttpResponse.json({}, { status: 500 })));
      const { overlay } = setup({ sean: [droppedRecord('old', 99)] });

      await overlay.start('sean');

      expect(overlay.state('show', 99).dropped).toBe(true);
      expect(overlay.state('movie', 1).watched).toBe(true);
    });

    it('should leave it unknown without a previous copy', async () => {
      server.use(http.get(`${API}/users/hidden/dropped`, () => HttpResponse.error()));
      const { overlay } = setup();

      await overlay.start('sean');

      expect(overlay.state('show', 2).dropped).toBeUndefined();
      expect(overlay.state('show', 2).watched).toBe(true);
    });
  });

  describe('patch', () => {
    it('should apply the update and roll it back', async () => {
      const { overlay } = setup();
      await overlay.start('sean');

      const rollback = overlay.patch('dropped', (dropped) => new Set([...dropped.keys(), 7]));
      expect(overlay.state('show', 7).dropped).toBe(true);

      rollback();
      expect(overlay.state('show', 7).dropped).toBe(false);
    });

    it('should not roll back over a refetched slice', async () => {
      const { overlay } = setup({ sean: [droppedRecord('old', 99)] });
      server.use(http.get(`${API}/sync/last_activities`, () => HttpResponse.json({}, { status: 502 })));
      await overlay.start('sean');
      const rollback = overlay.patch('dropped', () => new Set([7]));

      server.resetHandlers();
      await overlay.refresh();
      rollback();

      expect(overlay.state('show', 2).dropped).toBe(true);
    });

    it('should leave an unknown slice unknown', () => {
      const { overlay } = setup();

      overlay.patch('dropped', () => new Set([7]))();

      expect(overlay.state('show', 7).dropped).toBeUndefined();
    });
  });

  describe('stop and user switch', () => {
    it('should forget the state and delete the records on stop', async () => {
      const { overlay, records } = setup();
      await overlay.start('sean');

      await overlay.stop();

      expect(overlay.state('movie', 1).watched).toBeUndefined();
      expect(records.size).toBe(0);
    });

    it('should delete the previous user when another signs in', async () => {
      const { overlay, records } = setup({ justin: [droppedRecord(T0, 99)] });

      await overlay.start('sean');

      expect([...records.keys()]).toEqual(['sean']);
      expect(overlay.state('show', 99).dropped).toBe(false);
    });
  });

  describe('reset', () => {
    it('should delete the records and refetch every slice, even an unmoved one', async () => {
      const { overlay, records } = setup({ sean: [droppedRecord(T0, 99)] });
      await overlay.start('sean');
      expect(overlay.state('show', 99).dropped).toBe(true);
      requests.length = 0;

      await overlay.reset();

      expect(requests).toContain('/users/hidden/dropped');
      expect(overlay.state('show', 99).dropped).toBe(false);
      expect(overlay.state('show', 2).dropped).toBe(true);
      expect(records.get('sean')?.get('dropped')?.data).toBeInstanceOf(Map);
    });

    it('should only empty the cache when signed out', async () => {
      const { overlay, records } = setup({ justin: [droppedRecord(T0, 99)] });

      await overlay.reset();

      expect(requests).toEqual([]);
      expect(records.size).toBe(0);
    });
  });

  describe('recheck', () => {
    it('should check last_activities at most once a minute', async () => {
      let now = 0;
      const { overlay } = setup(undefined, () => now);
      await overlay.start('sean');
      requests.length = 0;

      now = 59_000;
      await overlay.recheck();
      expect(requests).toEqual([]);

      now = 60_000;
      await overlay.recheck();
      expect(requests).toEqual(['/sync/last_activities']);
    });
  });
});
