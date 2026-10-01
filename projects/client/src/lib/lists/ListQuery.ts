import type { ListItemType } from './listItemSorts.ts';

export type SortHow = 'asc' | 'desc';

/** A list page's query string, as the URL gave it. Left-out parts fall back to the list's own. */
export interface ListQuery {
  /** A sort OG knows, or undefined for the list's default sort. */
  readonly sortBy?: string;
  readonly sortHow?: SortHow;
  /** `?display=`: the chosen types. Empty is All Types. */
  readonly types: readonly ListItemType[];
  /** `?genres=`: genre slugs. Empty is All Genres. */
  readonly genres: readonly string[];
  readonly hide?: readonly string[];
  readonly terms?: string;
  readonly watchnow?: string;
  readonly page: number;
  readonly limit: number;
}
