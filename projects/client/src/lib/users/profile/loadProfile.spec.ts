import type { UserStatsResponse } from '@trakt/api';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import { toProfileUser } from '../toProfileUser.ts';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import { loadProfile } from './loadProfile.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const now = new Date('2026-09-29T15:00:00Z');
const seen: Request[] = [];

const full = (minutes: number, collected = 0) => ({
  watched: 1,
  collected,
  plays: 1,
  minutes,
  ratings: 0,
  comments: 0,
});
const stats = (minutes: number) =>
  ({ episodes: full(minutes), movies: full(0), ratings: { distribution: { '8': 3 } } }) as unknown as UserStatsResponse;

const movie = (id: number, runtime: number) => ({
  id,
  watched_at: '2026-09-20T00:00:00.000Z',
  type: 'movie',
  movie: { title: `Movie ${id}`, ids: { trakt: id, slug: `movie-${id}` }, runtime },
});

const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\//, ({ request }) => {
    seen.push(request);
    const url = new URL(request.url);
    // Three pages of 30-day movie history, one movie each.
    if (url.pathname.endsWith('/history/movies') && url.searchParams.has('start_at')) {
      const page = Number(url.searchParams.get('page'));
      return HttpResponse.json([movie(page, 100)], { headers: { 'X-Pagination-Page-Count': '3' } });
    }
    return HttpResponse.json([], { headers: { 'X-Pagination-Item-Count': '0' } });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const genre = {
  play_count: 2,
  genre: { slug: 'drama', name: 'Drama' },
  percentage: 100,
  percentage_row: 100,
  movies: { play_count: 2, ids: [1, 2] },
  shows: { play_count: 0, ids: [] },
  episodes: { play_count: 0, ids: [] },
};
const watchedMovie = (id: number, plays: number) => ({
  plays,
  last_watched_at: '2026-01-01T00:00:00.000Z',
  movie: { title: `Movie ${id}`, ids: { trakt: id, slug: `movie-${id}` }, runtime: 100 },
});

const load = (
  options: {
    stats?: UserStatsResponse | null;
    isSelf?: boolean;
    isPrivate?: boolean;
    isLocked?: boolean;
    settings?: ViewerSettings | null;
  } = {},
) =>
  loadProfile({
    fetch: (...args) => globalThis.fetch(...args),
    locals: { token: 'viewer-token' },
    params: { id: 'tester' },
    now,
    parent: () =>
      Promise.resolve({
        profile: { ...profile, isPrivate: options.isPrivate ?? false, isLocked: options.isLocked ?? false },
        stats: options.stats === undefined ? stats(60) : options.stats,
        isSelf: options.isSelf ?? false,
        datePreferences,
        settings: options.settings ?? null,
      }),
  });

describe('loadProfile', () => {
  it('should read public sections without the token and sum every page of the last 30 days', async () => {
    const data = await load();

    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
    const windowed = seen.filter((request) => new URL(request.url).searchParams.has('start_at'));
    expect(new URL(windowed[0]?.url ?? '').searchParams.get('start_at')).toBe('2026-08-30T00:00:00.000Z');
    expect(data.boxes?.recent.movies).toEqual({ minutes: 300, unique: 3 });
    expect(data.boxes?.featured).toMatchObject({ name: 'Watchlist', href: '/users/tester/watchlist', empty: true });
    expect(data.welcome).toBe(false);
  });

  it('should show the welcome hero instead of the boxes on your own empty profile', async () => {
    expect(await load({ stats: stats(0), isSelf: true })).toMatchObject({ boxes: null, welcome: true });
    expect(await load({ stats: stats(0) })).toMatchObject({ boxes: null, welcome: false });
  });

  it('should read a private profile the viewer can see again with the token', async () => {
    await load({ isPrivate: true });
    expect(seen.some((request) => request.headers.get('authorization') === 'Bearer viewer-token')).toBe(true);
  });

  it('should build the charts from the watched genres and the ratings in the stats', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/watched/genres', () => HttpResponse.json([genre])));
    const data = await load();

    expect(data.charts?.genres).toMatchObject([{ slug: 'drama', counts: [{ text: '2 movies' }] }]);
    expect(data.charts?.ratings).toMatchObject({ count: '3', average: '8.00' });
  });

  it('should hide the charts without genres, or when a genres body is off contract', async () => {
    expect((await load()).charts).toBeNull();

    server.use(http.get('https://apiz.trakt.tv/users/tester/watched/genres', () => HttpResponse.json([{ bad: 1 }])));
    expect((await load()).charts).toBeNull();
  });

  it('should rank all time over every page of the watched list', async () => {
    server.use(
      http.get('https://apiz.trakt.tv/users/tester/watched/movies', ({ request }) => {
        seen.push(request);
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json([watchedMovie(page, page)], { headers: { 'X-Pagination-Page-Count': '12' } });
      }),
    );
    const data = await load();

    // Capped at eight pages.
    const pages = seen.filter((request) => new URL(request.url).pathname.endsWith('/watched/movies'));
    expect(pages).toHaveLength(8);
    expect(new URL(pages[0]?.url ?? '').searchParams.get('extended')).toBe('full');
    expect(data.mostWatched?.movies.allTime.map(({ id }) => id)).toEqual([8, 7, 6]);
    expect(data.mostWatched?.movies.lastMonth.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(data.mostWatched?.windowStart).toBe('2026-08-30T00:00:00.000Z');
  });

  describe("the owner's saved settings", () => {
    const settings = {
      browsing: {
        profile: {
          favorites: { sort_by: 'watched', sort_how: 'desc' },
          most_watched_shows: { sort_by: 'time', tab: 'all_time' },
          most_watched_movies: { sort_by: 'plays', tab: 'last_30_days' },
        },
      },
    } as unknown as ViewerSettings;
    const favoriteReads = () =>
      seen.filter((request) => new URL(request.url).pathname.startsWith('/users/tester/favorites/'));
    const favorite = (id: number) => ({
      rank: id,
      id,
      listed_at: '2026-01-01T00:00:00.000Z',
      notes: null,
      type: 'movie',
      movie: { title: `Movie ${id}`, year: 2020, ids: { trakt: id, slug: `movie-${id}` } },
    });

    it('should read your favorites again in your saved order, with your token', async () => {
      server.use(
        http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/favorites\//, ({ request }) => {
          seen.push(request);
          const sorted = new URL(request.url).pathname.endsWith('/watched/desc');
          return HttpResponse.json([favorite(sorted ? 2 : 1)]);
        }),
      );
      const data = await load({ isSelf: true, settings });

      expect(favoriteReads().map((request) => new URL(request.url).pathname)).toEqual([
        '/users/tester/favorites/movie,show/random/asc',
        '/users/tester/favorites/movie,show/watched/desc',
      ]);
      expect(favoriteReads().at(1)?.headers.get('authorization')).toBe('Bearer viewer-token');
      expect(data.favorites.map(({ id }) => id)).toEqual([2]);
    });

    it('should keep the random favorites when the saved order fails', async () => {
      server.use(
        http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/favorites\//, ({ request }) => {
          seen.push(request);
          if (new URL(request.url).pathname.endsWith('/watched/desc')) return workerUnauthorized();
          return HttpResponse.json([favorite(1)]);
        }),
      );
      expect((await load({ isSelf: true, settings })).favorites.map(({ id }) => id)).toEqual([1]);
    });

    it('should apply your most watched sorts and default tabs', async () => {
      const data = await load({ isSelf: true, settings });
      expect(data.mostWatched?.shows).toMatchObject({ sortBy: 'time', tab: 'allTime' });
      expect(data.mostWatched?.movies).toMatchObject({ sortBy: 'plays', tab: 'lastMonth' });
    });

    it("should give another viewer OG's defaults, whatever the viewer saved", async () => {
      const data = await load({ settings });

      expect(favoriteReads().map((request) => new URL(request.url).pathname)).toEqual([
        '/users/tester/favorites/movie,show/random/asc',
      ]);
      expect(data.mostWatched?.shows).toMatchObject({ sortBy: 'plays', tab: 'lastMonth' });
      expect(data.mostWatched?.movies).toMatchObject({ sortBy: 'time', tab: 'lastMonth' });
    });

    it('should read your favorites once when you kept the random order', async () => {
      await load({ isSelf: true, settings: { browsing: {} } as unknown as ViewerSettings });
      expect(favoriteReads()).toHaveLength(1);
    });
  });

  it('should leave the charts and most watched out of a locked profile', async () => {
    expect(await load({ isLocked: true })).toMatchObject({ charts: null, mostWatched: null });
  });
});
