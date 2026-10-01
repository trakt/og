import { z } from 'zod/v4';
import { api } from '../api/api.ts';
import type { ApiGet } from './sliceSources.ts';

const rowsSchema = z.array(z.object({
  season: z.object({ ids: z.object({ trakt: z.number() }) }).optional(),
  episode: z.object({ ids: z.object({ trakt: z.number() }) }).optional(),
}));

/** Fresh membership for a season or episode, including entries beyond the first page. */
export async function loadWatchlistIds(client: ReturnType<typeof api>, type: 'season' | 'episode') {
  const ids = new Set<number>();
  let page = 1;
  let pages: number;
  do {
    const response = await client.sync.watchlist.get({
      params: { type: `${type}s`, sort_by: 'rank', sort_how: 'asc' },
      query: { limit: 250, page },
    });
    if (response.status !== 200) throw new Error('Watchlist unavailable');
    rowsSchema.parse(response.body).forEach((row) => {
      const id = row[type]?.ids.trakt;
      if (id !== undefined) ids.add(id);
    });
    pages = Number(response.headers.get('X-Pagination-Page-Count') ?? 1);
    page += 1;
  } while (page <= pages);
  return ids;
}

/** Minimal watchlist omits seasons/episodes. Keep those two small sets alongside movies and shows. */
export async function loadWatchlistExtras(get: ApiGet) {
  // Keep the overlay's injected authenticated request; the typed native client owns the route contract.
  const client = api({
    fetch: (input) => {
      const url = new URL(String(input));
      return get(`${url.pathname}${url.search}`);
    },
  });
  const [season, episode] = await Promise.all([
    loadWatchlistIds(client, 'season'),
    loadWatchlistIds(client, 'episode'),
  ]);
  return { season, episode };
}
