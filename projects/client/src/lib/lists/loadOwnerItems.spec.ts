import { describe, expect, it, vi } from 'vitest';
import { loadOwnerItems } from './loadOwnerItems.ts';
const row = (id: number) => ({
  type: 'movie',
  id,
  rank: id,
  listed_at: '2026-01-01',
  movie: { title: `Movie ${id}`, ids: { trakt: id + 500, slug: `movie-${id}` } },
});
const response = (rows: unknown[], total = rows.length) =>
  Response.json(rows, { headers: { 'x-pagination-item-count': String(total) } });
describe('loadOwnerItems', () => {
  it('should read every page in rank order using list item ids', async () => {
    const request = vi.fn(async (path: string) =>
      await Promise.resolve(response(
        Array.from(
          { length: path.includes('page=2') ? 2 : 250 },
          (_, i) => row(i + (path.includes('page=2') ? 251 : 1)),
        ),
        252,
      ))
    );
    const rows = await loadOwnerItems({ kind: 'watchlist', request });
    expect(rows).toHaveLength(252);
    expect(rows.at(-1)?.id).toBe(252);
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/sync/watchlist/all/rank/asc?extended=full%2Cimages&limit=250&page=1',
      '/sync/watchlist/all/rank/asc?extended=full%2Cimages&limit=250&page=2',
    ]);
  });
  it('should preserve type, genre, text, streaming, hide, and sorting for the selected items', async () => {
    const request = vi.fn(() => Promise.resolve(response([row(1)])));
    await loadOwnerItems({
      kind: 'favorites',
      request,
      selection: {
        query: {
          types: ['movie'],
          genres: ['drama'],
          terms: 'Heat',
          watchnow: 'netflix',
          hide: ['watched'],
          page: 3,
          limit: 24,
        },
        sort: { by: 'title', how: 'desc' },
      },
    });
    expect(request).toHaveBeenCalledWith(
      '/users/me/favorites/movie/title/desc?extended=full%2Cimages&limit=250&page=1&genres=drama&terms=Heat&watchnow=netflix&hide=watched',
    );
  });
  it('should refuse incomplete, malformed, duplicate, and unavailable reads', async () => {
    for (
      const result of [
        response([row(1)], 2),
        response([{}]),
        response([row(1), row(1)]),
        new Response(null, { status: 401 }),
        Response.json([row(1)]),
      ]
    ) {
      await expect(loadOwnerItems({ kind: 'watchlist', request: () => Promise.resolve(result) })).rejects.toThrow();
    }
  });
});
