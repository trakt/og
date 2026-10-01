import { isHttpError } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { loadItemComments } from './loadItemComments.ts';

const API = 'https://apiz.trakt.tv';
const show = { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, slug: 'breaking-bad', tvdb: 81189 } };
const comment = { id: 7, comment: 'Great.', review: false, spoiler: false, replies: 0, likes: 0 };
const requests: URL[] = [];
const server = setupServer(
  http.get(`${API}/shows/:id`, () => HttpResponse.json(show)),
  http.get(
    `${API}/shows/:id/seasons`,
    () => HttpResponse.json([{ number: 1, ids: { trakt: 3950 }, first_aired: '2008-01-20T02:00:00.000Z' }]),
  ),
  http.get(`${API}/shows/:id/seasons/:season/comments/:sort`, () =>
    HttpResponse.json([comment], {
      headers: { 'x-pagination-page': '2', 'x-pagination-page-count': '3', 'x-pagination-item-count': '201' },
    })),
  // Watch Now and anything missing.
  http.get(`${API}/*`, () => new HttpResponse(null, { status: 404 })),
);
server.events.on('request:start', ({ request }) => void requests.push(new URL(request.url)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

const load = (item: SubpageItem, path: string, sortBy?: string) =>
  loadItemComments({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { order: 'ymd', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
        settings: null,
        user: null,
      }),
    item,
    url: new URL(path, 'http://og.test'),
    sortBy,
  });

describe('loadItemComments', () => {
  it("should read the season's page with the mapped sort, the count and the pages", async () => {
    const data = await load(
      { type: 'season', id: 'breaking-bad', season: '1' },
      '/shows/breaking-bad/seasons/1/comments/rating?sort_how=desc&page=2',
      'rating',
    );

    const read = requests.find(({ pathname }) => pathname.includes('/comments/'));
    expect(read?.pathname).toBe('/shows/breaking-bad/seasons/1/comments/lowest');
    expect(Object.fromEntries(read?.searchParams ?? [])).toEqual({ extended: 'images', page: '2', limit: '100' });
    expect(data).toMatchObject({
      comments: [comment],
      count: 201,
      page: { type: 'paginated', current: 2, total: 3 },
      sort: { by: 'rating', how: 'desc' },
    });
    expect(data.next).toBeUndefined();
  });

  it('should answer a missing item with a 404', async () => {
    const failure = await load({ type: 'movie', id: 'nope' }, '/movies/nope/comments').catch((error: unknown) => error);

    expect(isHttpError(failure) && failure.status).toBe(404);
  });
});
