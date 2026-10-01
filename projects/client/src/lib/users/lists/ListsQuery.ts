import type { ListSortId } from './listSorts.ts';

/** How a lists index is sorted and searched. OG kept it in the query string, so a reload keeps it. */
export type ListsQuery = {
  readonly sort: ListSortId;
  /** OG's direction arrow flips the sort's natural direction; it doesn't pick ascending or descending. */
  readonly reversed: boolean;
  /** Matches a list's name or description, case-insensitively. */
  readonly terms: string;
};
