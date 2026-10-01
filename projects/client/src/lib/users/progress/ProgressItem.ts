import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { CatalogEpisode } from '../../shows/cache/ShowCatalog.ts';

/** One episode chip under an open season. */
export type ProgressEpisodeData = {
  readonly number: number;
  readonly title?: string;
  readonly done: boolean;
  readonly plays: number;
  readonly minutesWatched: number;
  /** The last watch, or when it was added to the library. */
  readonly at?: string;
};

export type ProgressSeasonData = {
  readonly number: number;
  readonly title?: string;
  readonly aired: number;
  readonly completed: number;
  readonly plays: number;
  readonly minutesWatched: number;
  readonly minutesLeft: number;
  readonly episodes: readonly ProgressEpisodeData[];
  /** Announced episodes that haven't aired yet, or have no air date. */
  readonly upcoming: readonly { readonly number: number; readonly title?: string }[];
};

/** What only the show's catalog knows: read when the row is expanded. */
export type ProgressDetail = {
  readonly seasons: readonly ProgressSeasonData[];
  readonly next?: CatalogEpisode;
  readonly last?: CatalogEpisode;
};

/**
 * One show's progress, computed in the browser from the overlay and the show caches. Without a catalog the counts
 * come from the show summary and the times are estimates (`exact` off); with one, they're per episode.
 */
export type ProgressItem = {
  readonly show: CachedShow;
  readonly aired: number;
  readonly completed: number;
  /** Every play, rewatches included. */
  readonly plays: number;
  readonly minutesWatched: number;
  readonly minutesLeft: number;
  readonly exact: boolean;
  /** The last watch, or the last addition to the library. */
  readonly lastAt?: string;
  readonly resetAt?: string;
  readonly droppedAt?: string;
  readonly detail?: ProgressDetail;
};
