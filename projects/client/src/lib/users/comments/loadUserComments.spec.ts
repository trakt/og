import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadUserComments } from './loadUserComments.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const seen: Request[] = [];
const comment = (id: number, parentId = 0) => ({
  id,
  parent_id: parentId,
  created_at: '2026-09-29T12:00:00.000Z',
  updated_at: '2026-09-29T12:00:00.000Z',
  comment: 'A great movie, really.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 1, completed_count: 1 },
  user: { username: 'tester', private: false, deleted: false, ids: { slug: 'tester', trakt: 1 } },
});
const movie = { title: 'Heat', year: 1995, ids: { trakt: 200, slug: 'heat-1995' }, images: { poster: [] } };
const pages = { 'X-Pagination-Page': '2', 'X-Pagination-Page-Count': '3', 'X-Pagination-Item-Count': '61' };

const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/comments\//, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([
      { type: 'movie', movie, comment: comment(1) },
      { type: 'movie', movie, comment: comment(2, 9) },
      { type: 'movie', movie, comment: comment(3, 9) },
    ], { headers: pages });
  }),
  http.get('https://apiz.trakt.tv/comments/9', ({ request }) => {
    seen.push(request);
    return HttpResponse.json({ ...comment(9), user: { ...comment(9).user, username: 'other' } });
  }),
  http.get('https://apiz.trakt.tv/users/tester/likes/comments', ({ request }) => {
    seen.push(request);
    // API's shape: no `ids.trakt` for the author, and an official list typed by its class.
    const { user } = comment(4);
    return HttpResponse.json([
      { liked_at: '2026-09-29T12:00:00.000Z', type: 'comment', comment_type: 'movie', movie, comment: comment(4) },
      {
        liked_at: '2026-09-28T12:00:00.000Z',
        type: 'comment',
        comment_type: 'officiallist',
        comment: { ...comment(5), user: { ...user, ids: { slug: 'tester' } } },
        list: { name: 'Picks', privacy: 'public', ids: { trakt: 7, slug: 'picks' }, user: { ids: { slug: 'trakt' } } },
      },
    ], { headers: pages });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

type Options = {
  params?: { comment_type?: 'all' | 'reviews' | 'shouts' | 'replies'; type?: 'all' | 'movies' | 'lists' };
  liked?: boolean;
  token?: string | null;
  locked?: boolean;
  private?: boolean;
  query?: string;
};

const load = (options: Options = {}) =>
  loadUserComments({
    fetch,
    parent: () =>
      Promise.resolve({
        profile: { ...profile, isLocked: options.locked ?? false, isPrivate: options.private ?? false },
      }),
    locals: { token: options.token ?? null },
    params: { id: 'tester', ...options.params },
    url: new URL(`https://og.trakt.tv/users/tester/comments${options.query ?? ''}`),
    liked: options.liked,
  });

const listingRequests = () => seen.filter((request) => request.url.includes('/users/tester/'));

describe('loadUserComments', () => {
  describe('for written comments', () => {
    it('should read 30 a page publicly, newest first, with pagination and the count', async () => {
      const data = await load({ query: '?page=2' });

      const [request] = listingRequests();
      const url = new URL(request?.url ?? '');
      expect(url.pathname).toBe('/users/tester/comments/all/all');
      expect(Object.fromEntries(url.searchParams)).toEqual({ extended: 'full,images', page: '2', limit: '30' });
      expect(request?.headers.get('authorization')).toBeNull();
      expect(data).toMatchObject({ liked: false, commentType: 'all', type: 'all', itemCount: 61 });
      expect(data.page).toMatchObject({ current: 2, total: 3 });
      expect(data.entries.map(({ row }) => row.comment.id)).toEqual([1, 2, 3]);
    });

    it('should read replies as every comment type with only replies, and attach each parent once', async () => {
      const data = await load({ params: { comment_type: 'replies', type: 'movies' } });

      const url = new URL(listingRequests().at(0)?.url ?? '');
      expect(url.pathname).toBe('/users/tester/comments/all/movies');
      expect(url.searchParams.get('include_replies')).toBe('only');
      expect(seen.filter((request) => request.url.endsWith('/comments/9'))).toHaveLength(1);
      expect(data.entries.map(({ parent }) => parent?.user.username)).toEqual([undefined, 'other', 'other']);
    });

    it('should read a private profile again with the viewer token', async () => {
      await load({ private: true, token: 'secret' });

      expect(listingRequests().map((request) => request.headers.get('authorization'))).toEqual([
        null,
        'Bearer secret',
      ]);
    });

    it('should render a locked profile empty', async () => {
      const data = await load({ locked: true });

      expect(data).toMatchObject({ entries: [], itemCount: 0 });
      expect(seen.some((request) => request.url.includes('/comments/9'))).toBe(false);
    });

    it('should fail when the API does', async () => {
      server.use(http.get(/\/users\/tester\/comments\//, () => new HttpResponse(null, { status: 500 })));

      await expect(load()).rejects.toMatchObject({ status: 502 });
    });
  });

  describe('for liked comments', () => {
    it('should not ask API without a viewer, which it answers with a 500', async () => {
      const data = await load({ liked: true });

      expect(listingRequests()).toHaveLength(0);
      expect(data).toMatchObject({ liked: true, entries: [], itemCount: 0 });
    });

    it('should read the likes with the token and map them like written comments', async () => {
      const data = await load({ liked: true, token: 'secret', params: { comment_type: 'reviews', type: 'movies' } });

      const [request] = listingRequests();
      const url = new URL(request?.url ?? '');
      expect(request?.headers.get('authorization')).toBe('Bearer secret');
      expect(url.searchParams.get('extended')).toBe('comments,full,images');
      expect(url.searchParams.get('limit')).toBe('30');
      expect(data).toMatchObject({ commentType: 'all', type: 'all', itemCount: 61 });
      expect(data.entries.map(({ row }) => [row.item.type, row.comment.user.ids.trakt])).toEqual([
        ['movie', 1],
        ['list', 0],
      ]);
    });

    it('should render a stale token empty and reject a body it cannot read', async () => {
      server.use(
        http.get('https://apiz.trakt.tv/users/tester/likes/comments', () => new HttpResponse(null, { status: 401 })),
      );
      expect(await load({ liked: true, token: 'stale' })).toMatchObject({ entries: [] });

      server.use(http.get('https://apiz.trakt.tv/users/tester/likes/comments', () => HttpResponse.json([{ nope: 1 }])));
      await expect(load({ liked: true, token: 'secret' })).rejects.toMatchObject({ status: 502 });
    });
  });
});
