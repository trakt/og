import type { FadeHideOption } from '../components/filters/fadeHide.ts';
import type { creditHideOptions } from './creditHideOptions.ts';
import type { CreditSortId } from './creditSorts.ts';

/** How the credits grid is sorted and filtered. OG kept it in the query string so a filtered view can be shared. */
export type CreditsQuery = {
  readonly fade: readonly FadeHideOption[];
  readonly hide: readonly (typeof creditHideOptions)[number]['id'][];
  readonly sort: CreditSortId;
  /** OG's direction arrow flips the sort's natural direction; it doesn't pick ascending or descending. */
  readonly reversed: boolean;
  /** Matches a title or a character, case-insensitively. */
  readonly terms: string;
  readonly movies: boolean;
  readonly shows: boolean;
};
