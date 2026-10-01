import { describe, expect, it } from 'vitest';
import { loadFavoriteRows } from './loadFavoriteRows.ts';

describe('loadFavoriteRows', () => {
  it('should read every page to find list-item ids independently of media ids', async () => {
    const rows = await loadFavoriteRows((path) =>
      Promise.resolve(
        Response.json(
          path.endsWith('page=1')
            ? [{ type: 'show', id: 42, show: { ids: { trakt: 1 } }, listed_at: '2026-09-29T12:00:00Z' }]
            : [{ type: 'movie', id: 99, movie: { ids: { trakt: 2 } }, notes: 'Great' }],
          { headers: { 'X-Pagination-Page-Count': '2' } },
        ),
      )
    );
    expect(rows.map((row) => row.id)).toEqual([42, 99]);
  });
  it('should reject malformed rows and invalid dates', async () => {
    await expect(loadFavoriteRows(() => Promise.resolve(Response.json([{ type: 'movie', id: 1, movie: {} }])))).rejects
      .toThrow();
    await expect(
      loadFavoriteRows(() =>
        Promise.resolve(Response.json([{ type: 'movie', id: 1, movie: { ids: { trakt: 2 } }, listed_at: 'bad' }]))
      ),
    ).rejects.toThrow();
  });
});
