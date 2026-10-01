import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../../users/toProfileUser.ts';
import { loadPersonalListComments } from './loadPersonalListComments.ts';

const API = 'https://apiz.trakt.tv';
const profile = toProfileUser({ username: 'sean', name: 'Sean', private: false, ids: { slug: 'sean' } });
const seen: Request[] = [];

const summary = (privacy: string) => ({
  name: 'Heist Night',
  description: 'Crews.',
  privacy,
  share_link: '',
  type: 'personal',
  display_numbers: true,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  item_count: 2,
  comment_count: 2,
  likes: 3,
  ids: { trakt: 44, slug: 'heist-night' },
  images: { posters: ['media.trakt.tv/images/movies/000/000/001/posters/medium/a.jpg.webp'] },
  user: { username: 'sean', private: false, ids: { slug: 'sean' } },
});
const comment = (id: number, slug: string) => ({
  id,
  parent_id: 0,
  created_at: '2026-09-29T12:00:00Z',
  updated_at: '2026-09-29T12:00:00Z',
  comment: 'A great list of heists.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user: { username: slug, ids: { slug } },
  user_stats: { play_count: 0, completed_count: 0 },
});

// Private lists read only with the token; the worker answers everyone else with an empty 204 and a 403. Its 401 and 403
// bodies are plain text under a JSON content type.
const plainText = (body: string, status: number) =>
  new HttpResponse(body, { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
let privacy = 'public';
const visible = (request: Request) => privacy === 'public' || request.headers.get('authorization') === 'Bearer viewer';
const stale = (request: Request) => request.headers.get('authorization') === 'Bearer stale';

const server = setupServer(
  http.get(`${API}/users/sean/lists/:list`, ({ request, params }) => {
    seen.push(request);
    if (stale(request)) return plainText('Unauthorized', 401);
    if (!['heist-night', '44'].includes(String(params.list)) || !visible(request)) {
      return new HttpResponse(null, { status: 204, headers: { 'content-type': 'application/json' } });
    }
    return HttpResponse.json(summary(privacy));
  }),
  http.get(`${API}/users/sean/lists/:list/comments/:sort`, ({ request, params }) => {
    seen.push(request);
    if (stale(request)) return plainText('Unauthorized', 401);
    if (!['heist-night', '44'].includes(String(params.list)) || !visible(request)) {
      return plainText('List is private or does not exist', 403);
    }
    return HttpResponse.json([comment(1, 'reader'), comment(2, 'writer')], {
      headers: { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '1', 'X-Pagination-Item-Count': '2' },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
  privacy = 'public';
});
afterAll(() => server.close());

const load = (options: { list?: string; token?: string | null; locked?: boolean; query?: string } = {}) =>
  loadPersonalListComments({
    fetch: (...args) => globalThis.fetch(...args),
    parent: () => Promise.resolve({ profile: { ...profile, isLocked: options.locked ?? false } }),
    locals: { token: options.token ?? null },
    params: { id: 'sean', list: options.list ?? 'heist-night' },
    url: new URL(
      `https://og.trakt.tv/users/sean/lists/${options.list ?? 'heist-night'}/comments${options.query ?? ''}`,
    ),
  });

const comments = () => seen.filter((request) => request.url.includes('/comments/'));

describe('loadPersonalListComments', () => {
  it('should read a public list and its comments without the token', async () => {
    const data = await load({ query: '?sort_by=newest&page=2' });
    expect(data).toMatchObject({
      sort: 'newest',
      itemCount: 2,
      page: { type: 'paginated', current: 1, total: 1 },
      list: { title: 'Heist Night', href: '/users/sean/lists/heist-night', id: 44, allowComments: true },
    });
    expect(data.list.posters.at(0)?.image).toContain('/posters/thumb/');
    expect(comments().at(0)?.url).toContain('/comments/newest?page=2&limit=100');
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
  });
  it('should keep a public list token-free for signed-in viewers', async () => {
    expect((await load({ token: 'viewer' })).comments.map(({ id }) => id)).toEqual([1, 2]);
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
  });
  it('should read a private list again with the token', async () => {
    privacy = 'private';
    const data = await load({ token: 'viewer' });
    expect(data.list.id).toBe(44);
    expect(comments().some((request) => request.headers.get('authorization') === 'Bearer viewer')).toBe(true);
  });
  it('should 404 a private list for anyone else, and on a stale token', async () => {
    privacy = 'private';
    await expect(load()).rejects.toMatchObject({ status: 404 });
    await expect(load({ token: 'stale' })).rejects.toMatchObject({ status: 404 });
  });
  it('should render public comments on a stale token without refreshing', async () => {
    expect((await load({ token: 'stale' })).comments).toHaveLength(2);
  });
  it('should 404 a missing list', async () => {
    await expect(load({ list: 'nope' })).rejects.toMatchObject({ status: 404 });
    await expect(load({ list: 'nope', token: 'viewer' })).rejects.toMatchObject({ status: 404 });
  });
  it("should 404, not throw, on the comments read's plain-text 403 even when the summary reads", async () => {
    server.use(
      http.get(
        `${API}/users/sean/lists/:list/comments/:sort`,
        () => plainText('List is private or does not exist', 403),
      ),
    );
    await expect(load()).rejects.toMatchObject({ status: 404 });
  });
  it('should redirect an id to the canonical slug, keeping the query', async () => {
    await expect(load({ list: '44', query: '?sort_by=replies' })).rejects.toMatchObject({
      status: 301,
      location: '/users/sean/lists/heist-night/comments?sort_by=replies',
    });
  });
  it('should render nothing for a locked profile', async () => {
    expect(await load({ locked: true })).toMatchObject({ comments: [], itemCount: 0 });
  });
  it('should report upstream failures', async () => {
    server.use(http.get(`${API}/users/sean/lists/:list/comments/:sort`, () => new HttpResponse(null, { status: 500 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
