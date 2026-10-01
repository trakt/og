import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadPickerLists } from './loadPickerLists.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const target = { type: 'movie', id: 1, title: 'Fight Club' } as const;
const catalog = [{ id: 12, name: 'Friday films', count: 3, display_order: 1, type: 'collaborative', owner_id: 2 }];
function fixture() {
  server.use(
    http.get('https://apiz.trakt.tv/v3/users/me/lists', () => HttpResponse.json(catalog)),
    http.get(
      'https://apiz.trakt.tv/lists/12',
      () => HttpResponse.json({ privacy: 'friends', user: { ids: { slug: 'friend' } } }),
    ),
  );
}
describe('loadPickerLists', () => {
  it('should load owner metadata and membership across all pages, excluding built-in lists', async () => {
    fixture();
    server.use(http.get('https://apiz.trakt.tv/movies/1/listed', ({ request }) => {
      const page = new URL(request.url).searchParams.get('page');
      return HttpResponse.json(
        page === '1'
          ? [{ ids: { trakt: 12 }, type: 'personal' }]
          : [{ ids: { trakt: 99 }, type: 'watchlist' }, { ids: { trakt: 100 }, type: 'favorites' }],
        { headers: { 'X-Pagination-Page-Count': '2' } },
      );
    }));
    const result = await loadPickerLists({ fetch, target });
    expect(result.watchlisted).toBe(true);
    expect(result.lists).toEqual([{
      id: 12,
      name: 'Friday films',
      count: 3,
      rank: 1,
      collaboration: true,
      privacy: 'friends',
      owner: 'friend',
      selected: true,
    }]);
  });
  it.each(['season', 'episode'] as const)('should use ID membership and a fresh %s watchlist', async (type) => {
    fixture();
    server.use(
      http.get(`https://apiz.trakt.tv/v3/${type}s/1/me/lists`, () => HttpResponse.json([12])),
      http.get(
        `https://apiz.trakt.tv/sync/watchlist/${type}s/rank/asc`,
        ({ request }) =>
          HttpResponse.json(
            [{ [type]: { ids: { trakt: new URL(request.url).searchParams.get('page') === '2' ? 1 : 2 } } }],
            { headers: { 'X-Pagination-Page-Count': '2' } },
          ),
      ),
    );
    const result = await loadPickerLists({ fetch, target: { ...target, type } });
    expect(result.watchlisted).toBe(true);
    expect(result.lists.at(0)?.selected).toBe(true);
  });
  it('should reject malformed catalogue data instead of silently offering an empty picker', async () => {
    server.use(
      http.get('https://apiz.trakt.tv/v3/users/me/lists', () => HttpResponse.json([{ id: 'bad' }])),
      http.get('https://apiz.trakt.tv/movies/1/listed', () => HttpResponse.json([])),
    );
    await expect(loadPickerLists({ fetch, target })).rejects.toThrow();
  });
});
