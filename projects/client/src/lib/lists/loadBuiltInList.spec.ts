import { http, HttpResponse, type HttpResponseResolver } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../users/toProfileUser.ts';
import { loadBuiltInList } from './loadBuiltInList.ts';

const API = 'https://apiz.trakt.tv';
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const seen: { url: URL; auth: string | null }[] = [];

const profileOf = ({ isPrivate = false } = {}) =>
  toProfileUser({ username: 'sean', name: 'Sean', private: isPrivate, vip: true, ids: { slug: 'sean' } });

const movie = (id: number, title: string) => ({
  type: 'movie',
  rank: id,
  id: 100 + id,
  listed_at: '2026-01-02T00:00:00.000Z',
  notes: id === 1 ? 'A favorite.' : null,
  movie: {
    title,
    ids: { trakt: id, slug: title.toLowerCase() },
    images: { poster: [], fanart: [`media.trakt.tv/images/movies/${id}/fanarts/medium/f.jpg.webp`] },
  },
});

// The owner's default sort is Added Date, newest first. A private profile's items only answer the token.
let isPrivate = false;
const visible = (request: Request) => !isPrivate || request.headers.get('authorization') !== null;

const record = (request: Request) =>
  seen.push({ url: new URL(request.url), auth: request.headers.get('authorization') });

const items: HttpResponseResolver = ({ request, params }) => {
  record(request);
  const by = typeof params.by === 'string' ? params.by : 'added';
  const how = typeof params.how === 'string' ? params.how : 'desc';
  const rows = visible(request) ? [movie(1, 'Heat'), movie(2, 'Ronin')] : [];
  return HttpResponse.json(rows, {
    headers: {
      'X-Pagination-Page': '1',
      'X-Pagination-Page-Count': '1',
      'X-Pagination-Item-Count': String(rows.length),
      'X-Sort-By': by,
      'X-Sort-How': how,
    },
  });
};

const server = setupServer(
  http.get(`${API}/users/sean/:kind/comments/:sort`, ({ request, params }) => {
    record(request);
    if (!visible(request)) return HttpResponse.json([], { headers: { 'X-Pagination-Item-Count': '0' } });
    return HttpResponse.json([], {
      headers: {
        'X-List-ID': params.kind === 'watchlist' ? '2106' : '2107',
        'X-Pagination-Item-Count': '4',
      },
    });
  }),
  http.get(`${API}/users/sean/:kind`, items),
  http.get(`${API}/users/sean/:kind/:type`, items),
  http.get(`${API}/users/sean/:kind/:type/:by/:how`, items),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
  isPrivate = false;
});
afterAll(() => server.close());

type LoadOptions = {
  kind?: 'watchlist' | 'favorites';
  query?: string;
  token?: string | null;
  viewer?: { slug: string; isVip: boolean };
  profile?: ReturnType<typeof profileOf>;
};

const load = ({ kind = 'watchlist', query = '', token = null, viewer, profile = profileOf() }: LoadOptions = {}) =>
  loadBuiltInList({
    fetch,
    locals: { token },
    params: { id: 'sean' },
    url: new URL(`https://og.trakt.tv/users/sean/${kind}${query}`),
    parent: () =>
      Promise.resolve({
        profile,
        user: viewer ? { firstName: 'X', avatarUrl: '', ...viewer } : null,
        datePreferences,
      }),
    kind,
  });

const itemPaths = () => seen.filter(({ url }) => !url.pathname.includes('/comments')).map(({ url }) => url.pathname);

describe('loadBuiltInList', () => {
  it("should read a public watchlist in its owner's sort without the token, once", async () => {
    const result = await load({ token: 'abc', viewer: { slug: 'kim', isVip: false } });
    if (!result.list) throw new Error('no list');
    expect(result.list).toMatchObject({ id: 2106, name: 'Watchlist', commentCount: 4, allowComments: true });
    expect(result.sort).toEqual({ by: 'added', how: 'desc' });
    expect(result.cards.map(({ title }) => title)).toEqual(['Heat', 'Ronin']);
    expect(result.total).toBe(2);
    // The watchlist fits its page, so its stats come from it, with the ids for the viewer's percentages.
    expect(result.stats).toEqual({
      count: 2,
      runtime: 180,
      items: [{ type: 'movie', id: 1 }, { type: 'movie', id: 2 }],
    });
    expect(result.collaborators).toEqual([]);
    // The owner is a VIP, so the first ranked item takes the cover.
    expect(result.listCover).toBe('https://media.trakt.tv/images/movies/1/fanarts/full/f.jpg.webp');
    expect(itemPaths()).toEqual(['/users/sean/watchlist', '/users/sean/watchlist/all/rank/asc']);
    expect(seen.every(({ auth }) => auth === null)).toBe(true);
    expect(seen.find(({ url }) => url.pathname.endsWith('/comments/newest'))?.url.searchParams.get('limit')).toBe('1');
  });

  it('should send the type and genre filters and fall back to rank for a VIP sort', async () => {
    const result = await load({ kind: 'favorites', query: '?sort=imdb_rating,desc&display=movie&genres=drama' });
    if (!result.list) throw new Error('no list');
    expect(result.list.name).toBe('Favorites');
    expect(result.sort).toEqual({ by: 'rank', how: 'desc' });
    const paths = itemPaths();
    expect(paths).toContain('/users/sean/favorites/movie/imdb_rating/desc');
    expect(paths).toContain('/users/sean/favorites/movie/rank/desc');
    const ranked = seen.find(({ url }) => url.pathname === '/users/sean/favorites/movie/rank/desc');
    expect(ranked?.url.searchParams.get('genres')).toBe('drama');
  });

  it("should read a private profile's watchlist with the token", async () => {
    isPrivate = true;
    const result = await load({
      token: 'abc',
      viewer: { slug: 'sean', isVip: true },
      profile: profileOf({ isPrivate: true }),
    });
    if (!result.list) throw new Error('no list');
    expect(result.list).toMatchObject({ id: 2106, isPublic: false });
    expect(result.sort).toEqual({ by: 'added', how: 'desc' });
    expect(result.cards).toHaveLength(2);
    const authorized = seen.filter(({ auth }) => auth === 'Bearer abc').map(({ url }) => url.pathname);
    expect(authorized).toEqual(
      expect.arrayContaining(['/users/sean/watchlist', '/users/sean/watchlist/comments/newest']),
    );
  });

  it('should skip the list on a locked profile', async () => {
    const result = await load({ profile: { ...profileOf(), isLocked: true } });
    expect(result.list).toBeNull();
    expect(result.kind).toBe('watchlist');
  });
});
