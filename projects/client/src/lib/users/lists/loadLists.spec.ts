import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadLists } from './loadLists.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const API = 'https://apiz.trakt.tv/users/tester';
const seen: Request[] = [];

const list = (id: number, name: string) => ({
  name,
  description: null,
  privacy: 'public',
  share_link: '',
  type: 'personal',
  display_numbers: false,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  item_count: 2,
  comment_count: 0,
  likes: 1,
  ids: { trakt: id, slug: name.toLowerCase() },
  user: { username: 'tester', private: false, ids: { slug: 'tester' } },
  images: { posters: [] },
});
const items = [{ type: 'movie', movie: { title: 'Heat', images: { poster: ['media.trakt.tv/p.jpg'] } } }];
const pageHeaders = (page: number, count: number) => ({
  'X-Pagination-Page': String(page),
  'X-Pagination-Page-Count': String(count),
});

const server = setupServer(
  http.get(`${API}/lists`, ({ request }) => {
    seen.push(request);
    const page = Number(new URL(request.url).searchParams.get('page'));
    return HttpResponse.json([list(page, `List ${page}`)], { headers: pageHeaders(page, 2) });
  }),
  http.get(`${API}/watchlist/movie,show,season,episode/rank/asc`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(items, { headers: { 'X-Pagination-Item-Count': '315' } });
  }),
  http.get(`${API}/favorites/movie,show/rank/asc`, () => new HttpResponse(null, { status: 500 })),
  http.get(`${API}/lists/collaborations`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([list(9, 'Shared'), list(8, 'Older')], { headers: { 'X-Runtime': '0.04' } });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (
  options: { mode?: 'personal' | 'collaborations'; token?: string | null; locked?: boolean; query?: string } = {},
) =>
  loadLists({
    fetch,
    locals: { token: options.token ?? null },
    params: { id: 'tester' },
    url: new URL(`https://og.trakt.tv/users/tester/lists${options.query ?? ''}`),
    parent: () => Promise.resolve({ profile: { ...profile, isLocked: options.locked ?? false } }),
    mode: options.mode ?? 'personal',
  });

describe('loadLists', () => {
  it('should read every page of personal lists in rank order after the built-in rows', async () => {
    const result = await load({ query: '?sort=title,desc' });
    expect(result.query).toEqual({ sort: 'title', reversed: true, terms: '' });
    expect(result.listsComplete).toBe(true);
    expect(result.lists.map(({ name, rank }) => [name, rank])).toEqual([['List 1', 1], ['List 2', 2]]);
    expect(result.builtIns.map(({ name, itemCount, posters }) => [name, itemCount, posters.length]))
      .toEqual([['Watchlist', 315, 1], ['Favorites', 0, 0]]);
    expect(new URL(seen.at(0)?.url ?? '').search).toBe('?extended=images&page=1&limit=250');
  });

  it('should send the viewer token and fall back to public lists when it has gone stale', async () => {
    server.use(http.get(`${API}/lists`, ({ request }) => {
      seen.push(request);
      return request.headers.has('authorization')
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json([list(1, 'Public')]);
    }));
    const result = await load({ token: 'stale' });
    expect(result.lists.map(({ name }) => name)).toEqual(['Public']);
    const reads = seen.filter((request) => new URL(request.url).pathname === '/users/tester/lists');
    expect(reads.map((request) => request.headers.get('authorization'))).toEqual(['Bearer stale', null]);
  });

  it('should prevent reordering a truncated or partially failed list read', async () => {
    server.use(http.get(`${API}/lists`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json([list(page, `List ${page}`)], { headers: pageHeaders(page, 11) });
    }));
    expect((await load()).listsComplete).toBe(false);
    server.use(http.get(`${API}/lists`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return page === 1
        ? HttpResponse.json([list(1, 'First')], { headers: pageHeaders(1, 2) })
        : new HttpResponse(null, { status: 503 });
    }));
    expect((await load()).listsComplete).toBe(false);
  });

  it('should read collaborations without built-in rows', async () => {
    const result = await load({ mode: 'collaborations' });
    expect(result.builtIns).toEqual([]);
    expect(result.lists.map(({ name }) => name)).toEqual(['Shared', 'Older']);
    expect(result.query.sort).toBe('updated');
  });

  it('should render a locked profile without an error', async () => {
    server.use(http.get(`${API}/lists`, () => new HttpResponse(null, { status: 403 })));
    expect(await load({ locked: true })).toMatchObject({ builtIns: [], lists: [] });
  });

  it('should report missing users, failures and invalid collaborations', async () => {
    server.use(http.get(`${API}/lists`, () => new HttpResponse(null, { status: 404 })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
    server.use(http.get(`${API}/lists`, () => new HttpResponse(null, { status: 503 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(http.get(`${API}/lists/collaborations`, () => HttpResponse.json([{ id: 1 }])));
    await expect(load({ mode: 'collaborations' })).rejects.toMatchObject({ status: 502 });
  });
});
