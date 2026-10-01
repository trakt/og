import { describe, expect, it } from 'vitest';
import { loadWatchlistExtras } from './loadWatchlistExtras.ts';
describe('loadWatchlistExtras', () => {
  it('should gather seasons and episodes across every page', async () => {
    const result = await loadWatchlistExtras((path) => {
      const url = new URL(path, 'https://apiz.trakt.tv');
      const type = url.pathname.includes('seasons') ? 'season' : 'episode';
      const page = Number(url.searchParams.get('page'));
      return Promise.resolve(
        Response.json([{ [type]: { ids: { trakt: page } } }], { headers: { 'X-Pagination-Page-Count': '2' } }),
      );
    });
    expect(result).toEqual({ season: new Set([1, 2]), episode: new Set([1, 2]) });
  });
  it('should reject a failed or malformed watchlist without replacing its cached copy', async () => {
    await expect(loadWatchlistExtras(() => Promise.resolve(new Response(null, { status: 503 })))).rejects.toThrow();
    await expect(loadWatchlistExtras(() => Promise.resolve(Response.json(null)))).rejects.toThrow();
  });
});
