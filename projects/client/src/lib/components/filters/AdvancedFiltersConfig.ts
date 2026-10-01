import type { ListFilterKey, RangeFilterKey } from './advancedFilters.ts';
import type { RangeScale } from './rangeScale.ts';

/** What one page's advanced filter panel offers. Charts and calendars each build one. */
export type AdvancedFiltersConfig = {
  readonly type: 'shows' | 'movies';
  /** A mixed calendar merges these media types' option lists. */
  readonly optionTypes?: readonly ('shows' | 'movies')[];
  /** Filter terms on pages whose full result window can be searched locally. */
  readonly query?: boolean;
  /** "Available to watch on". */
  readonly watchnow: boolean;
  /** The list filters, in panel order. */
  readonly lists: readonly ListFilterKey[];
  /** The sliders, in panel order. The rating ones sit under "Site Ratings". */
  readonly ranges: readonly RangeFilterKey[];
  readonly scales: Readonly<Record<RangeFilterKey, RangeScale>>;
  /** OG's Time Period select, on the pages that take a period. */
  readonly period?: {
    readonly value: string;
    readonly options: readonly { readonly value: string; readonly label: string }[];
  };
};
