import { listItemSorts } from '../lists/listItemSorts.ts';
import type { SortHow } from '../lists/ListQuery.ts';
import { fetchListItems, usedListSort } from '../lists/loadListItems.ts';
import { type ListItemCard, toListItemCard } from '../lists/toListItemCard.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';

type FetchWatchlistParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  datePreferences: DatePreferences;
};

export type DashboardWatchlist = {
  readonly cards: readonly ListItemCard[];
  /** Every item on the watchlist, for "All N items". */
  readonly total: number;
  /** The watchlist's own sort, as the worker applied it: "RT Tomatometer". */
  readonly sortName: string;
  readonly sortHow: SortHow;
};

/** OG's dashboard shows up to three rows of six. */
const LIMIT = 18;

/**
 * The viewer's watchlist panel: the first 18 items in the watchlist's own sort, which the worker applies
 * when the request names none and reports in `X-Sort-By` and `X-Sort-How`. The cards carry the list page's
 * sort-dependent lines.
 */
export async function fetchWatchlist(
  { fetch, token, datePreferences }: FetchWatchlistParams,
): Promise<DashboardWatchlist> {
  const items = await fetchListItems({
    fetch,
    token,
    base: '/users/me/watchlist',
    query: { types: [], genres: [], page: 1, limit: LIMIT },
  });
  if (items.status !== 200) throw new Error(`The watchlist failed with ${items.status}`);

  const used = usedListSort(items.headers);
  const sortBy = used.by ?? 'rank';
  const cards = items.rows.map((row) => toListItemCard(row, { sortBy, datePreferences }));

  return {
    cards,
    total: Number(items.headers.get('x-pagination-item-count')) || cards.length,
    sortName: listItemSorts.find(({ by }) => by === sortBy)?.label ?? 'Rank',
    sortHow: used.how === 'desc' ? 'desc' : 'asc',
  };
}
