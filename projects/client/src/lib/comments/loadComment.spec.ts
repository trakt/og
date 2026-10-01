import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadComment } from './loadComment.ts';

const user = { username: 'sean', name: 'Sean', private: false, deleted: false, vip: false, ids: { slug: 'sean' } };
const comment = (id: number, parent = 0) => ({
  id,
  parent_id: parent,
  comment: `Comment ${id} has more than five words.`,
  spoiler: false,
  review: false,
  created_at: '2026-09-19T00:03:17.000Z',
  updated_at: '2026-09-19T00:03:17.000Z',
  replies: parent ? 0 : 2,
  likes: 0,
  user_rating: null,
  user_stats: { rating: null, play_count: 1, completed_count: 1 },
  user,
});
const item = { type: 'movie', movie: { title: 'Heat', year: 1995, ids: { trakt: 1, slug: 'heat-1995' } } };
// A missing comment, as the worker sends it: text under a JSON content type.
const missing = () =>
  new HttpResponse('Comment not found', { status: 404, headers: { 'content-type': 'application/json' } });

const requests: Request[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/comments/:id', ({ request, params }) => {
    requests.push(request);
    return HttpResponse.json(comment(Number(params.id)));
  }),
  http.get('https://apiz.trakt.tv/comments/:id/item', ({ request }) => {
    requests.push(request);
    return HttpResponse.json(item);
  }),
  http.get('https://apiz.trakt.tv/comments/:id/replies', ({ request }) => {
    requests.push(request);
    return HttpResponse.json([comment(11, 10), comment(12, 10)], {
      headers: { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '1' },
    });
  }),
  // Watch Now: the sidebar renders without it.
  http.get('https://apiz.trakt.tv/*', () => new HttpResponse(null, { status: 404 })),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

const load = (id = '10') =>
  loadComment({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
        settings: null,
        user: null,
      }),
    id,
  });
const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error);
const status = async (promise: Promise<unknown>) => {
  const thrown = await failure(promise);
  return isHttpError(thrown) ? thrown.status : thrown;
};

describe('loadComment', () => {
  it('should load the comment, its item and its replies without the viewer token', async () => {
    const data = await load();
    expect(data.comment.id).toBe(10);
    expect(data.replies.map(({ id }) => id)).toEqual([11, 12]);
    expect(data.media).toMatchObject({ title: 'Heat', year: 1995, href: '/movies/heat-1995' });
    expect(requests.map(({ url }) => new URL(url).pathname).toSorted()).toEqual([
      '/comments/10',
      '/comments/10/item',
      '/comments/10/replies',
    ]);
    expect(new URL(requests.find(({ url }) => url.includes('/item'))?.url ?? '').searchParams.get('extended')).toBe(
      'full,images',
    );
    expect(requests.every((request) => !request.headers.has('authorization'))).toBe(true);
  });

  it("should send a reply to its parent's page at its anchor", async () => {
    server.use(http.get('https://apiz.trakt.tv/comments/:id', () => HttpResponse.json(comment(11, 10))));
    const thrown = await failure(load('11'));
    expect(isRedirect(thrown) && [thrown.status, thrown.location]).toEqual([302, '/comments/10#comment-11']);
  });

  it('should 404 an id that is not a number, a missing comment, and a gone or hidden item', async () => {
    expect(await status(load('abc'))).toBe(404);
    expect(requests).toHaveLength(0);

    server.use(http.get('https://apiz.trakt.tv/comments/:id', missing), http.get(/\/comments\/\d+\/item/, missing));
    expect(await status(load())).toBe(404);

    server.resetHandlers();
    server.use(http.get('https://apiz.trakt.tv/comments/:id', () => HttpResponse.json({})));
    expect(await status(load())).toBe(404);

    server.resetHandlers();
    server.use(http.get('https://apiz.trakt.tv/comments/:id/item', () => HttpResponse.json({ type: 'list' })));
    expect(await status(load())).toBe(404);
  });

  it('should report failures and an invalid item as 502s', async () => {
    server.use(http.get('https://apiz.trakt.tv/comments/:id', () => new HttpResponse(null, { status: 503 })));
    expect(await status(load())).toBe(502);

    server.resetHandlers();
    server.use(http.get('https://apiz.trakt.tv/comments/:id/item', () => HttpResponse.json({ movie: 1 })));
    expect(await status(load())).toBe(502);

    server.resetHandlers();
    server.use(http.get('https://apiz.trakt.tv/comments/:id/replies', () => new HttpResponse(null, { status: 500 })));
    expect(await status(load())).toBe(502);
  });
});
