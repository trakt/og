import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchListItemRefs } from './fetchListItemRefs.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const movie = (id: number) => ({
  type: 'movie',
  id,
  rank: id,
  listed_at: '2026-01-01T00:00:00.000Z',
  movie: { title: `Movie ${id}`, ids: { trakt: id * 10, slug: `movie-${id}` } },
});
const read = () =>
  fetchListItemRefs({
    fetch,
    base: '/users/sean/lists/7/items',
    query: { types: ['movie'], genres: [] },
    sort: { by: 'rank', how: 'asc' },
  });

describe('fetchListItemRefs', () => {
  it('should read every page in the sort', async () => {
    const seen: string[] = [];
    server.use(http.get('https://apiz.trakt.tv/users/sean/lists/7/items/movie/rank/asc', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      seen.push(new URL(request.url).search);
      return HttpResponse.json(page === 1 ? Array.from({ length: 250 }, (_, i) => movie(i + 1)) : [movie(251)]);
    }));
    const refs = await read();
    expect(refs).toHaveLength(251);
    expect(refs.at(-1)).toEqual({ id: 251, type: 'movie', trakt: 2510 });
    expect(seen).toEqual(['?extended=full&page=1&limit=250', '?extended=full&page=2&limit=250']);
  });

  it('should keep the visible filters when reading items for bulk actions', async () => {
    let search: URLSearchParams | undefined;
    server.use(http.get('https://apiz.trakt.tv/users/sean/lists/7/items/all/title/asc', ({ request }) => {
      search = new URL(request.url).searchParams;
      return HttpResponse.json([movie(1)]);
    }));
    const refs = await fetchListItemRefs({
      fetch,
      base: '/users/sean/lists/7/items',
      query: { types: [], genres: ['drama'], hide: ['nonotes'], terms: 'Movie', watchnow: 'netflix' },
      sort: { by: 'title', how: 'asc' },
    });
    expect(refs).toEqual([{ id: 1, type: 'movie', trakt: 10 }]);
    expect(Object.fromEntries(search ?? [])).toEqual({
      extended: 'full',
      page: '1',
      limit: '250',
      genres: 'drama',
      terms: 'Movie',
      watchnow: 'netflix',
      hide: 'nonotes',
      hide_no_notes: 'true',
    });
  });

  it('should finish an exact maximum-size list without asking for a twenty-first page', async () => {
    const seen: number[] = [];
    server.use(http.get('https://apiz.trakt.tv/users/sean/lists/7/items/movie/rank/asc', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      seen.push(page);
      return HttpResponse.json(Array.from({ length: 250 }, (_, i) => movie((page - 1) * 250 + i + 1)), {
        headers: { 'X-Pagination-Item-Count': '5000' },
      });
    }));
    expect(await read()).toHaveLength(5000);
    expect(seen).toHaveLength(20);
  });

  it('should throw when a page fails', async () => {
    server.use(
      http.get(
        'https://apiz.trakt.tv/users/sean/lists/7/items/movie/rank/asc',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(read()).rejects.toThrow();
  });
});
