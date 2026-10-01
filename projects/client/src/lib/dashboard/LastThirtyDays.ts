import type { GenreBar } from '../users/profile/toGenreBar.ts';

/** "**45** episodes (50 plays)" in the panel's help line. */
export type WatchedCount = {
  /** "45", in bold. */
  readonly count: string;
  /** "episodes", or "episode" for one. */
  readonly word: string;
  /** "(50 plays)", only when there are more plays than items. */
  readonly plays?: string;
};

/** One bar of the minutes-per-day chart. */
export type MinutesDay = {
  /** `YYYY-MM-DD` in the viewer's zone. */
  readonly date: string;
  /** The day of the month, under the bar. */
  readonly day: number;
  readonly minutes: number;
  /** The bar's height as a share of the chart, 0 to 100. */
  readonly height: number;
  /** "2h 1m", the tooltip's first line. */
  readonly time: string;
  /** "Tuesday — Sep 29". */
  readonly label: string;
  /** "3 episodes (4 plays)", "1 movie": what was played that day. */
  readonly counts: readonly string[];
  /** The viewer's history for that day. */
  readonly href: string;
};

/** The dashboard's Last 30 Days panel. */
export type LastThirtyDays = {
  /** "2d 12h 1m", bold before "watched". */
  readonly time: string;
  readonly episodes: WatchedCount;
  readonly movies: WatchedCount;
  /** Today and the 29 days before it, oldest first. Empty when nothing was watched: OG hid the chart. */
  readonly days: readonly MinutesDay[];
  readonly genres: readonly GenreBar[];
};
