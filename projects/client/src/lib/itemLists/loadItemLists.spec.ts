import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type ItemListsItem, loadItemLists } from './loadItemLists.ts';

const API = 'https://apiz.trakt.tv';
const show = { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, slug: 'breaking-bad', tvdb: 81189 } };
const person = {
  name: 'Bryan Cranston',
  ids: { trakt: 297737, slug: 'bryan-cranston', imdb: 'nm0186505', tmdb: 17419 },
  images: {
    headshot: ['media.trakt.tv/images/people/000/297/737/headshots/medium/h.jpg.webp'],
    fanart: ['media.trakt.tv/images/people/000/297/737/fanarts/medium/f.jpg.webp'],
  },
};
const list = {
  name: 'Heist Night',
  description: 'Crews and vaults.',
  privacy: 'public',
  share_link: '',
  type: 'personal',
  display_numbers: false,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
  item_count: 12,
  comment_count: 3,
  likes: 40,
  ids: { trakt: 7, slug: 'heist-night' },
  user: { username: 'sean', name: 'Sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 2 } },
};
const pages = { 'x-pagination-page': '2', 'x-pagination-page-count': '3', 'x-pagination-item-count': '61' };
const requests: URL[] = [];
const server = setupServer(
  http.get(`${API}/shows/:id`, () => HttpResponse.json(show)),
  http.get(
    `${API}/shows/:id/seasons`,
    () => HttpResponse.json([{ number: 1, ids: { trakt: 3950 }, first_aired: '2008-01-20T02:00:00.000Z' }]),
  ),
  http.get(`${API}/shows/:id/seasons/:season/lists/:type/:sort`, () => HttpResponse.json([list], { headers: pages })),
  http.get(`${API}/people/:id`, () => HttpResponse.json(person)),
  http.get(`${API}/people/:id/lists/:type/:sort`, () => HttpResponse.json([])),
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

const load = (item: ItemListsItem, path: string, type?: string, sortBy?: string) =>
  loadItemLists({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { order: 'ymd', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
        settings: null,
        user: null,
      }),
    item,
    url: new URL(path, 'http://og.test'),
    type,
    sortBy,
  });

describe('loadItemLists', () => {
  it("should read the season's page with the API's type and sort, the count and the pages", async () => {
    const data = await load(
      { type: 'season', id: 'breaking-bad', season: '1' },
      '/shows/breaking-bad/seasons/1/lists/favorites/popularity?page=2',
      'favorites',
      'popularity',
    );

    const read = requests.find(({ pathname }) => pathname.includes('/lists/'));
    expect(read?.pathname).toBe('/shows/breaking-bad/seasons/1/lists/recommendations/popular');
    expect(Object.fromEntries(read?.searchParams ?? [])).toEqual({ extended: 'images', page: '2', limit: '30' });
    expect(data).toMatchObject({
      lists: [{ id: 7, href: '/users/sean/lists/heist-night', likeCount: 40 }],
      count: 61,
      page: { type: 'paginated', current: 2, total: 3 },
      query: { type: 'favorites', sortBy: 'popularity' },
      kind: 'season',
      media: { title: 'Season 1', href: '/shows/breaking-bad/seasons/1' },
    });
  });

  it("should frame a person's lists with the headshot and no Watch Now", async () => {
    const data = await load({ type: 'person', id: 'bryan-cranston' }, '/people/bryan-cranston/lists');

    expect(requests.find(({ pathname }) => pathname.includes('/lists/'))?.pathname).toBe(
      '/people/bryan-cranston/lists/personal/popular',
    );
    expect(data).toMatchObject({
      lists: [],
      count: 0,
      kind: 'person',
      watchNow: null,
      media: {
        title: 'Bryan Cranston',
        href: '/people/bryan-cranston',
        poster: 'https://media.trakt.tv/images/people/000/297/737/headshots/medium/h.jpg.webp',
        fanart: 'https://media.trakt.tv/images/people/000/297/737/fanarts/full/f.jpg.webp',
      },
    });
  });

  it("should redirect a person's other id to the slug's lists", async () => {
    const failure = await load({ type: 'person', id: '297737' }, '/people/297737/lists').catch((error: unknown) =>
      error
    );

    expect(isRedirect(failure) && failure.location).toBe('/people/bryan-cranston/lists');
  });

  it('should answer a missing item with a 404', async () => {
    const failure = await load({ type: 'movie', id: 'nope' }, '/movies/nope/lists').catch((error: unknown) => error);

    expect(isHttpError(failure) && failure.status).toBe(404);
  });
});
