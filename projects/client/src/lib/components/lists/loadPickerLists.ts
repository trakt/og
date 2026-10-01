import { z } from 'zod/v4';
import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { ListTarget } from './ListTarget.ts';
import { loadListCatalog } from './loadListCatalog.ts';
import { loadWatchlistIds } from '../../overlay/loadWatchlistExtras.ts';

const membershipSchema = z.array(z.object({ ids: z.object({ trakt: z.number() }), type: z.string() }));

async function membership(fetch: typeof globalThis.fetch, target: ListTarget) {
  // Season/episode summary routes are nested under shows; the v3 endpoints accept their Trakt ids directly.
  if (target.type === 'season' || target.type === 'episode') {
    const [response, watchlist] = await Promise.all([
      rawApiFetch({ fetch, path: `/v3/${target.type}s/${target.id}/me/lists` }),
      loadWatchlistIds(api({ fetch }), target.type),
    ]);
    if (!response.ok) throw new Error('List membership unavailable');
    return {
      ids: new Set(z.array(z.number()).parse(await response.json())),
      watchlisted: watchlist.has(target.id),
    };
  }
  const ids = new Set<number>();
  let watchlisted = false;
  let page = 1;
  let pages: number;
  do {
    const response = await rawApiFetch({
      fetch,
      path: `/${target.type === 'person' ? 'people' : `${target.type}s`}/${target.id}/listed?limit=100&page=${page}`,
    });
    if (!response.ok) throw new Error('List membership unavailable');
    membershipSchema.parse(await response.json()).forEach((row) => {
      if (row.type === 'watchlist') watchlisted = true;
      else if (row.type === 'personal') ids.add(row.ids.trakt);
    });
    pages = Number(response.headers.get('X-Pagination-Page-Count') ?? 1);
    page += 1;
  } while (page <= pages);
  return { ids, watchlisted };
}

/** Fresh own and collaborative lists, and this item's membership, when the picker opens. */
export async function loadPickerLists({ fetch, target }: { fetch: typeof globalThis.fetch; target: ListTarget }) {
  const [lists, selected] = await Promise.all([
    loadListCatalog(fetch),
    membership(fetch, target),
  ]);
  return {
    lists: lists.map((list) => ({ ...list, selected: selected.ids.has(list.id) })),
    watchlisted: selected.watchlisted,
  };
}
