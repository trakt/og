import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api } from '../api/api.ts';
import { fetchFollowingCount } from './fetchFollowingCount.ts';
import { fetchRecommendations } from './fetchRecommendations.ts';

const BASE = 'https://apiz.trakt.tv';
const now = new Date('2026-09-30T12:00:00Z');
const seen: Request[] = [];
const server = setupServer();
const client = api({ fetch: (...args) => globalThis.fetch(...args), token: 'abc' });

const media = (id: number, title: string, released: string) => ({
  title,
  year: 2020,
  ids: { trakt: id, slug: `slug-${id}` },
  rating: 8.1,
  runtime: 50,
  first_aired: released,
  released: released.slice(0, 10),
  aired_episodes: 12,
  // Every image type, as API sends them.
  images: {
    poster: [`media.trakt.tv/images/x/${id}/posters/medium/p.jpg.webp`],
    fanart: [],
    logo: [],
    clearart: [],
    banner: [],
    thumb: [],
  },
  favorited_by: [],
  recommended_by: [],
});

const recommend = (type: 'shows' | 'movies', rows: readonly ReturnType<typeof media>[]) =>
  http.get(`${BASE}/recommendations/${type}`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(rows);
  });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (following: number | null = 2) =>
  fetchRecommendations({ api: client, following: Promise.resolve(following), now, order: 'mdy' });

describe('fetchRecommendations', () => {
  it("should ask for ten of each and map them to poster cards with the viewer's following count", async () => {
    server.use(
      recommend('shows', [media(1, 'Out', '2020-01-01T00:00:00.000Z'), media(2, 'Soon', '2027-01-01T00:00:00.000Z')]),
      recommend('movies', [media(3, 'Film', '2020-01-01T00:00:00.000Z')]),
    );

    const recs = await load();
    const url = new URL(seen.at(0)?.url ?? '');

    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('extended')).toBe('full,images');
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer abc');
    expect(recs.following).toBe(2);
    expect(recs.shows?.map(({ href, released }) => ({ href, released }))).toEqual([
      { href: '/shows/slug-1', released: true },
      { href: '/shows/slug-2', released: false },
    ]);
    expect(recs.movies?.at(0)?.image).toBe('https://media.trakt.tv/images/x/3/posters/thumb/p.jpg.webp');
  });

  it('should let one column fail without the other', async () => {
    server.use(
      http.get(`${BASE}/recommendations/shows`, () => new HttpResponse(null, { status: 500 })),
      recommend('movies', []),
    );

    expect(await load(null)).toEqual({ shows: null, movies: [], following: null });
  });
});

describe('fetchFollowingCount', () => {
  it("should read the viewer's network.following, or null when the stats fail", async () => {
    server.use(
      http.get(
        `${BASE}/users/me/stats`,
        () => HttpResponse.json({ network: { friends: 0, followers: 9, following: 4 } }),
      ),
    );
    expect(await fetchFollowingCount({ api: client })).toBe(4);

    server.use(http.get(`${BASE}/users/me/stats`, () => new HttpResponse(null, { status: 401 })));
    expect(await fetchFollowingCount({ api: client })).toBeNull();
  });

  describe('with the ignore settings', () => {
    const loadIgnoring = (ignore: { ignoreCollected: boolean; ignoreWatchlisted: boolean }) =>
      fetchRecommendations({ api: client, following: Promise.resolve(1), now, order: 'mdy', ignore });

    it('should leave out watchlisted items natively', async () => {
      server.use(recommend('shows', []), recommend('movies', []));

      await loadIgnoring({ ignoreCollected: false, ignoreWatchlisted: true });
      const url = new URL(seen.at(0)?.url ?? '');

      expect(url.searchParams.get('ignore_watchlisted')).toBe('true');
      expect(url.searchParams.has('hide_collected')).toBe(false);
    });

    it("should leave out the library through API, and drop a row that doesn't parse", async () => {
      const broken = { title: 'No ids' };
      server.use(
        http.get(`${BASE}/recommendations/shows`, ({ request }) => {
          seen.push(request);
          return HttpResponse.json([media(1, 'Kept', '2020-01-01T00:00:00.000Z'), broken]);
        }),
        recommend('movies', [media(3, 'Film', '2020-01-01T00:00:00.000Z')]),
      );

      const recs = await loadIgnoring({ ignoreCollected: true, ignoreWatchlisted: false });
      const url = new URL(seen.at(0)?.url ?? '');

      expect(url.searchParams.get('hide_collected')).toBe('true');
      expect(url.searchParams.get('ignore_collected')).toBe('true');
      expect(url.searchParams.has('ignore_watchlisted')).toBe(false);
      expect(recs.shows?.map(({ href }) => href)).toEqual(['/shows/slug-1']);
      expect(recs.movies).toHaveLength(1);
    });

    it('should send neither by default', async () => {
      server.use(recommend('shows', []), recommend('movies', []));

      await load();
      const url = new URL(seen.at(0)?.url ?? '');

      expect([...url.searchParams.keys()].toSorted()).toEqual(['extended', 'limit']);
    });
  });
});
