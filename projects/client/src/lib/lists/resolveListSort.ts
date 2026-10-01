import { listItemSorts } from './listItemSorts.ts';
import type { ListQuery, SortHow } from './ListQuery.ts';

export type ListSort = { readonly by: string; readonly how: SortHow };

type ResolveListSortParams = {
  query: Pick<ListQuery, 'sortBy' | 'sortHow'>;
  /** The list's own default sort. */
  fallback: ListSort;
  /** The viewer is a VIP. */
  vip: boolean;
};

/**
 * The sort a list page shows: the URL's, else the list's default, and Rank for a VIP-only
 * sort when the viewer isn't a VIP. A default the menu doesn't know is Rank too.
 */
export function resolveListSort({ query, fallback, vip }: ResolveListSortParams): ListSort {
  const how = query.sortHow ?? fallback.how;
  const sort = listItemSorts.find(({ by }) => by === (query.sortBy ?? fallback.by));
  if (!sort) return { by: 'rank', how };
  if (sort.vip && !vip) return { by: 'rank', how };
  return { by: sort.by, how };
}
