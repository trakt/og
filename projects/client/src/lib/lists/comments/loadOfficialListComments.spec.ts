import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadOfficialListComments } from './loadOfficialListComments.ts';

const API = 'https://apiz.trakt.tv';
const seen: Request[] = [];

const summary = (type: string) => ({
  name: 'The Dark Knight Collection',
  description: 'Nolan.',
  privacy: 'public',
  share_link: '',
  type,
  display_numbers: true,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  item_count: 3,
  comment_count: 1,
  likes: 144,
  ids: { trakt: 29, slug: 'the-dark-knight-collection' },
  images: { posters: [] },
  user: { username: 'Trakt', private: false, ids: { slug: null } },
});
const comment = {
  id: 9,
  parent_id: 0,
  created_at: '2026-09-29T12:00:00Z',
  updated_at: '2026-09-29T12:00:00Z',
  comment: 'The best trilogy ever made.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user: { username: 'reader', ids: { slug: 'reader' } },
  user_stats: { play_count: 0, completed_count: 0 },
};

const server = setupServer(
  http.get(`${API}/lists/:id`, ({ request, params }) => {
    seen.push(request);
    if (params.id === 'someones-list') return HttpResponse.json(summary('personal'));
    if (!['the-dark-knight-collection', '29'].includes(String(params.id))) {
      return new HttpResponse(null, { status: 204, headers: { 'content-type': 'application/json' } });
    }
    return HttpResponse.json(summary('official'));
  }),
  http.get(`${API}/lists/:id/comments/:sort`, ({ request, params }) => {
    seen.push(request);
    // The worker answers a slug with no comments: only the Trakt id reads them.
    if (params.id !== '29') return HttpResponse.json([], { headers: { 'X-Pagination-Item-Count': '0' } });
    return HttpResponse.json([comment], {
      headers: { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '1', 'X-Pagination-Item-Count': '1' },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (slug = 'the-dark-knight-collection') =>
  loadOfficialListComments({
    fetch: (...args) => globalThis.fetch(...args),
    params: { slug },
    url: new URL(`https://og.trakt.tv/lists/official/${slug}/comments?sort_by=replies`),
  });

describe('loadOfficialListComments', () => {
  it("should read an official list's comments by its Trakt id, without the token", async () => {
    const data = await load();
    expect(data).toMatchObject({
      sort: 'replies',
      itemCount: 1,
      list: { title: 'The Dark Knight Collection', href: '/lists/official/the-dark-knight-collection', id: 29 },
    });
    expect(data.comments.map(({ id }) => id)).toEqual([9]);
    expect(seen.find((request) => request.url.includes('/comments/'))?.url).toContain('/lists/29/comments/replies');
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
  });
  it('should 404 a missing list and a list that is not official', async () => {
    await expect(load('nope')).rejects.toMatchObject({ status: 404 });
    await expect(load('someones-list')).rejects.toMatchObject({ status: 404 });
  });
  it("should 404, not throw, on the comments read's plain-text 403", async () => {
    server.use(http.get(`${API}/lists/:id/comments/:sort`, () =>
      new HttpResponse('List is private or does not exist', {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
  });
  it('should redirect an id to the canonical slug', async () => {
    await expect(load('29')).rejects.toMatchObject({
      status: 301,
      location: '/lists/official/the-dark-knight-collection/comments?sort_by=replies',
    });
  });
});
