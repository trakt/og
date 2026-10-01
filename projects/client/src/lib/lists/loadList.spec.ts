import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../users/toProfileUser.ts';
import { loadList } from './loadList.ts';

const API = 'https://apiz.trakt.tv';
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const profile = toProfileUser({
  username: 'sean',
  name: 'Sean',
  private: false,
  vip: true,
  ids: { slug: 'sean' },
});
const seen: { url: URL; auth: string | null }[] = [];

const summary = (privacy = 'public') => ({
  name: 'Heist Night',
  description: 'Crews.',
  privacy,
  share_link: '',
  type: 'personal',
  display_numbers: true,
  allow_comments: true,
  sort_by: 'added',
  sort_how: 'desc',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  item_count: 2,
  comment_count: 0,
  likes: 3,
  ids: { trakt: 44, slug: 'heist-night' },
  user: { username: 'sean', private: false, ids: { slug: 'sean' } },
});
const movie = (id: number, title: string) => ({
  type: 'movie',
  rank: id,
  id: 100 + id,
  listed_at: '2026-01-02T00:00:00.000Z',
  notes: null,
  movie: {
    title,
    ids: { trakt: id, slug: title.toLowerCase() },
    images: { poster: [], fanart: [`media.trakt.tv/images/movies/${id}/fanarts/medium/f.jpg.webp`] },
  },
});
const pageHeaders = (sortBy: string, sortHow: string) => ({
  'X-Pagination-Page': '1',
  'X-Pagination-Page-Count': '1',
  'X-Pagination-Item-Count': '2',
  'X-Sort-By': sortBy,
  'X-Sort-How': sortHow,
});

const record = (request: Request) =>
  seen.push({ url: new URL(request.url), auth: request.headers.get('authorization') });

// The list is private: only the token reads it. The worker answers everyone else with an empty 204.
let privacy = 'public';
const visible = (request: Request) => privacy === 'public' || request.headers.get('authorization') !== null;

const server = setupServer(
  http.get(`${API}/users/sean/lists/:list`, ({ request, params }) => {
    record(request);
    if (params.list !== 'heist-night' && params.list !== '44') return new HttpResponse(null, { status: 204 });
    if (!visible(request)) {
      return new HttpResponse(null, { status: 204, headers: { 'content-type': 'application/json' } });
    }
    return HttpResponse.json(summary(privacy));
  }),
  http.get(`${API}/users/sean/lists/:list/items*`, ({ request, params }) => {
    record(request);
    if (params.list !== 'heist-night' || !visible(request)) {
      return new HttpResponse('List is private or does not exist', { status: 403 });
    }
    const [, by = 'added', how = 'desc'] = new URL(request.url).pathname.split('/items').at(1)?.split('/').slice(1) ??
      [];
    return HttpResponse.json([movie(1, 'Heat'), movie(2, 'Ronin')], { headers: pageHeaders(by, how) });
  }),
  http.get(
    `${API}/watchnow/sources/us`,
    () => HttpResponse.json([{ us: [{ source: 'netflix', name: 'Netflix', color: '#e50914', images: {} }] }]),
  ),
  http.get(`${API}/lists/44/collaborators`, ({ request }) => {
    record(request);
    return HttpResponse.json([{ username: 'kim', name: 'Kim', ids: { slug: 'kim' } }]);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
  privacy = 'public';
});
afterAll(() => server.close());

const load = (
  options: { list?: string; query?: string; token?: string | null; viewer?: { slug: string; isVip: boolean } } = {},
) =>
  loadList({
    fetch,
    locals: { token: options.token ?? null },
    params: { id: 'sean', list: options.list ?? 'heist-night' },
    url: new URL(`https://og.trakt.tv/users/sean/lists/${options.list ?? 'heist-night'}${options.query ?? ''}`),
    parent: () =>
      Promise.resolve({
        profile,
        isSelf: false,
        user: options.viewer ? { firstName: 'X', avatarUrl: '', ...options.viewer } : null,
        datePreferences,
      }),
  });

const paths = () => seen.map(({ url }) => url.pathname);

const loaded = async (options?: Parameters<typeof load>[0]) => {
  const result = await load(options);
  if (!result.list) throw new Error('no list');
  return result;
};

describe('loadList', () => {
  it('should read a public list and its default sort without the token, once', async () => {
    const result = await load({ token: 'abc', viewer: { slug: 'kim', isVip: false } });
    expect(result.list?.name).toBe('Heist Night');
    if (!result.list) return;
    expect(result.sort).toEqual({ by: 'added', how: 'desc' });
    expect(result.cards.map(({ title }) => title)).toEqual(['Heat', 'Ronin']);
    expect(result.collaborators).toEqual(['Kim']);
    expect(result.isCollaborator).toBe(true);
    expect(result.viewerCollaboratorName).toBe('Kim');
    expect(result.listCover).toBe('https://media.trakt.tv/images/movies/1/fanarts/full/f.jpg.webp');
    expect(paths().filter((path) => path.includes('/items'))).toHaveLength(2);
    expect(seen.every(({ auth }) => auth === null)).toBe(true);
    expect(seen.find(({ url }) => url.pathname.endsWith('/items'))?.url.search)
      .toBe('?extended=full%2Cimages&page=1&limit=120');
  });

  it('should fall back to rank for a VIP sort and send the filters', async () => {
    const result = await load({ query: '?sort=imdb_rating,asc&display=movie&genres=drama' });
    if (!result.list) throw new Error('no list');
    expect(result.sort).toEqual({ by: 'rank', how: 'asc' });
    const items = seen.filter(({ url }) => url.pathname.includes('/items/movie/'));
    expect(items.map(({ url }) => url.pathname)).toEqual([
      '/users/sean/lists/heist-night/items/movie/imdb_rating/asc',
      '/users/sean/lists/heist-night/items/movie/rank/asc',
    ]);
    expect(items.at(1)?.url.searchParams.get('genres')).toBe('drama');
  });

  it('should read a private list with the token', async () => {
    privacy = 'private';
    const result = await load({ token: 'abc', viewer: { slug: 'sean', isVip: true } });
    if (!result.list) throw new Error('no list');
    expect(result.list.pills).toEqual(['Private']);
    expect(result.cards).toHaveLength(2);
    const authorized = seen.filter(({ auth }) => auth === 'Bearer abc').map(({ url }) => url.pathname);
    // The contract's summary path ends in a slash.
    expect(authorized).toContain('/users/sean/lists/heist-night/');
    expect(authorized).toContain('/lists/44/collaborators');
  });

  it('should send hide and title filters with the viewer token but keep the cover unfiltered', async () => {
    const result = await load({
      query: '?hide=nonotes,watched&terms=Heat',
      token: 'abc',
      viewer: { slug: 'kim', isVip: true },
    });
    if (!result.list) throw new Error('no list');
    const filtered = seen.filter(({ url, auth }) =>
      url.pathname.includes('/items') && auth === 'Bearer abc' && url.searchParams.has('hide')
    );
    expect(filtered).toHaveLength(1);
    expect(filtered.at(0)?.url.searchParams.get('hide')).toBe('nonotes,watched');
    expect(filtered.at(0)?.url.searchParams.get('hide_no_notes')).toBe('true');
    expect(filtered.at(0)?.url.searchParams.get('hide_watched')).toBe('true');
    expect(filtered.at(0)?.url.searchParams.get('terms')).toBe('Heat');
    const cover = seen.find(({ url }) => url.pathname.endsWith('/all/rank/asc'));
    expect(cover?.url.searchParams.has('hide')).toBe(false);
    expect(cover?.url.searchParams.has('terms')).toBe(false);
  });

  it('should send bare streaming slugs with the token and resolve applied chips', async () => {
    const result = await load({ query: '?watchnow=netflix', token: 'abc', viewer: { slug: 'kim', isVip: true } });
    if (!result.list) throw new Error('no list');
    expect(result.filterSources.get('netflix')?.name).toBe('Netflix');
    expect(seen.some(({ url, auth }) => url.searchParams.get('watchnow') === 'netflix' && auth === 'Bearer abc')).toBe(
      true,
    );
  });

  it('should keep the public response when a viewer’s filter token is stale', async () => {
    server.use(http.get(`${API}/users/sean/lists/:list/items*`, ({ request }) => {
      if (request.headers.get('authorization')) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json([movie(1, 'Heat')], { headers: pageHeaders('added', 'desc') });
    }));
    const result = await load({ query: '?hide=watched', token: 'stale' });
    if (!result.list) throw new Error('no list');
    expect(result.cards.at(0)?.title).toBe('Heat');
  });

  it('should 404 a list the viewer cannot see', async () => {
    privacy = 'private';
    await expect(load()).rejects.toMatchObject({ status: 404 });
    await expect(load({ list: 'missing' })).rejects.toMatchObject({ status: 404 });
  });

  it('should count a list that fits its page from that page', async () => {
    const signedOut = await loaded();
    // Two movies without runtimes: OG's 90 minutes each.
    expect(signedOut.stats).toEqual({ count: 2, runtime: 180 });
    seen.length = 0;
    const signedIn = await loaded({ token: 'abc', viewer: { slug: 'kim', isVip: false } });
    expect(signedIn.stats).toEqual({
      count: 2,
      runtime: 180,
      items: [{ type: 'movie', id: 1 }, { type: 'movie', id: 2 }],
    });
    expect(paths().filter((path) => path.includes('/items'))).toHaveLength(2);
  });

  it('should stream the stats of a longer list from every page of it', async () => {
    const statsPages: URL[] = [];
    server.use(
      http.get(`${API}/users/sean/lists/heist-night/items*`, ({ request }) => {
        const url = new URL(request.url);
        record(request);
        const page = Number(url.searchParams.get('page'));
        const limit = Number(url.searchParams.get('limit'));
        if (url.searchParams.get('extended') === 'full') statsPages.push(url);
        const first = (page - 1) * limit + 1;
        const rows = Array.from(
          { length: Math.max(0, Math.min(limit, 600 - first + 1)) },
          (_, i) => movie(first + i, `Movie ${first + i}`),
        );
        return HttpResponse.json(rows, {
          headers: { ...pageHeaders('rank', 'asc'), 'X-Pagination-Item-Count': '600', 'X-Pagination-Page-Count': '5' },
        });
      }),
    );
    const result = await loaded({ query: '?display=movie', viewer: { slug: 'kim', isVip: false } });
    expect(result.cards).toHaveLength(120);
    const stats = await result.stats;
    expect(stats).toMatchObject({ count: 600, runtime: 600 * 90 });
    expect(stats?.items).toHaveLength(600);
    expect(statsPages.map((url) => `${url.pathname}?${url.searchParams}`)).toEqual(
      [1, 2, 3].map((page) =>
        `/users/sean/lists/heist-night/items/movie/rank/asc?extended=full&page=${page}&limit=250`
      ),
    );
  });

  it('should leave the stats out when a page of them fails', async () => {
    server.use(
      http.get(`${API}/users/sean/lists/heist-night/items*`, ({ request }) => {
        if (new URL(request.url).searchParams.get('extended') === 'full') {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json(Array.from({ length: 120 }, (_, i) => movie(i + 1, `Movie ${i + 1}`)), {
          headers: { ...pageHeaders('added', 'desc'), 'X-Pagination-Item-Count': '300' },
        });
      }),
    );
    const result = await loaded();
    expect(await result.stats).toBeNull();
  });

  it('should redirect an id to the list slug', async () => {
    await expect(load({ list: '44', query: '?sort=title,asc' }))
      .rejects.toMatchObject({ status: 301, location: '/users/sean/lists/heist-night?sort=title,asc' });
  });
});
