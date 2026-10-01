import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../../users/toProfileUser.ts';
import { loadBuiltInListComments } from './loadBuiltInListComments.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const seen: Request[] = [];
const comment = (id: number, slug: string) => ({
  id,
  parent_id: 0,
  created_at: '2026-09-29T12:00:00Z',
  updated_at: '2026-09-29T12:00:00Z',
  comment: 'A great list.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user: { username: slug, ids: { slug } },
  user_stats: { play_count: 0, completed_count: 0 },
});
const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/(watchlist|favorites)\/comments\//, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([comment(1, 'reader'), comment(2, 'writer')], {
      headers: {
        'X-Pagination-Page': '2',
        'X-Pagination-Page-Count': '3',
        'X-Pagination-Item-Count': '201',
        'X-List-ID': '42',
      },
    });
  }),
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/(watchlist|favorites)\/all\/rank\/asc/, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{
      type: 'movie',
      movie: { title: 'Film', images: { poster: ['media.trakt.tv/poster.jpg'] } },
    }]);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (
  options: {
    kind?: 'watchlist' | 'favorites';
    token?: string | null;
    locked?: boolean;
    private?: boolean;
    query?: string;
  } = {},
) =>
  loadBuiltInListComments({
    fetch: (...args) => globalThis.fetch(...args),
    parent: () =>
      Promise.resolve({
        profile: { ...profile, isLocked: options.locked ?? false, isPrivate: options.private ?? false },
      }),
    locals: { token: options.token ?? null },
    params: { id: 'tester' },
    kind: options.kind ?? 'watchlist',
    url: new URL(`https://og.trakt.tv/users/tester/watchlist/comments${options.query ?? ''}`),
  });

describe('loadBuiltInListComments', () => {
  it('should read both built-in lists publicly, default to 100 per page and map pagination and list id', async () => {
    for (const kind of ['watchlist', 'favorites'] as const) {
      const data = await load({ kind });
      expect(data).toMatchObject({ sort: 'likes', list: { id: 42 }, itemCount: 201, page: { current: 2, total: 3 } });
      expect(data.comments).toHaveLength(2);
      expect(data.list.posters.at(0)?.title).toBe('Film');
      expect(data.list).toMatchObject({
        href: `/users/tester/${kind}`,
        fullTitle: expect.stringMatching(/^Tester's /),
      });
      expect(data.list.allowComments).toBe(false);
      expect(seen.at(-2)?.url).toContain(`/${kind}/comments/likes?page=1&limit=100`);
    }
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
  });
  it('should keep a public profile token-free for signed-in viewers and pass the sort and page on', async () => {
    const data = await load({ token: 'viewer', query: '?sort_by=oldest&page=2&limit=20' });
    expect(data.comments).toHaveLength(2);
    expect(seen.find((r) => r.url.includes('/comments/'))?.url).toContain('/comments/oldest?page=2&limit=20');
    expect(seen.every((r) => !r.headers.has('authorization'))).toBe(true);
  });
  it('should render no comments for locked profiles and authorize visible private lists', async () => {
    expect((await load({ locked: true })).comments).toEqual([]);
    await load({ private: true, token: 'viewer' });
    expect(seen.some((r) => r.url.includes('/comments/') && r.headers.get('authorization') === 'Bearer viewer')).toBe(
      true,
    );
  });
  it('should report missing lists and upstream failures', async () => {
    for (const [status, expected] of [[404, 404], [500, 502]]) {
      server.use(
        http.get(
          'https://apiz.trakt.tv/users/tester/watchlist/comments/likes',
          () => new HttpResponse(null, { status }),
        ),
      );
      await expect(load()).rejects.toMatchObject({ status: expected });
    }
  });
  it('should return an empty list and no item id when there are no comments', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/watchlist/comments/likes', () =>
      HttpResponse.json([], {
        headers: { 'X-Pagination-Item-Count': '0', 'X-Pagination-Page-Count': '1' },
      })));
    expect(await load()).toMatchObject({ comments: [], itemCount: 0, list: { id: null } });
  });
  it('should render no private comments on a stale token and cap oversized page sizes', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/watchlist/comments/likes', ({ request }) => {
      seen.push(request);
      // The worker's 401 is plain text under a JSON content type.
      return request.headers.has('authorization')
        ? new HttpResponse('Unauthorized', {
          status: 401,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        })
        : HttpResponse.json([]);
    }));
    expect((await load({ private: true, token: 'stale', query: '?limit=500&page=bad' })).comments).toEqual([]);
    expect(seen.filter((r) => r.url.includes('/comments/')).every((r) => r.url.includes('page=1&limit=100'))).toBe(
      true,
    );
  });
});
