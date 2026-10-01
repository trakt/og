import type { DashboardPrefs } from './dashboardPrefs.ts';
import type { UpNextSortBy } from './upNextSorts.ts';

/** Up Next's sort: OG's key and direction, and its name for the help line. */
export type UpNextSort = { readonly by: UpNextSortBy; readonly how: 'asc' | 'desc'; readonly title: string };

/**
 * Everything the dashboard panels read from the viewer's settings, from
 * `/users/settings` and the per-browser `dashboardPrefs`. `toDashboardSettings` builds it.
 */
export type DashboardSettings = {
  readonly upNext: {
    readonly sort: UpNextSort;
    /** With "only favorites", how many favorite services the viewer has; 0 when it's off or they have none. */
    readonly favorites: number;
    readonly simpleProgress: boolean;
    /** 's auto refresh, for the dashboard actions. */
    readonly refresh: boolean;
    readonly poster: DashboardPrefs['on_deck_poster'];
  };
  readonly schedule: {
    readonly filter: DashboardPrefs['upcoming_filter'];
    readonly startDay: DashboardPrefs['upcoming_start_day'];
    readonly poster: DashboardPrefs['upcoming_poster'];
  };
  readonly recommendations: { readonly ignoreCollected: boolean; readonly ignoreWatchlisted: boolean };
  /** The panels the viewer hid. Suggested People is cut, so it has no switch here. */
  readonly hidden: {
    readonly upNext: boolean;
    readonly schedule: boolean;
    readonly watchlist: boolean;
    readonly lastThirtyDays: boolean;
    readonly recentlyWatched: boolean;
    readonly socialFeed: boolean;
    readonly recommendations: boolean;
  };
};
