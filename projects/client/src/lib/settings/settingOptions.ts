import { dashboardPrefs } from '../dashboard/dashboardPrefs.ts';
import { upNextSorts } from '../dashboard/upNextSorts.ts';
import { listItemSorts } from '../lists/listItemSorts.ts';

/**
 * OG control values as `[value, label]`, in OG's order, shared by the
 * General panels. For the Global and Spoilers selects the first is what OG shows when the setting was never saved.
 */
export const settingOptions = {
  progress: upNextSorts.map(({ by, label }) => [by, label] as const),
  favorites: listItemSorts.filter(({ by }) => by !== 'my_rating').map(({ by, label }) => [by, label] as const),
  days: dashboardPrefs.START_DAYS.map((day) =>
    [
      day,
      (day === 'two_days_ago' ? '2 days ago' : day === 'three_days_ago' ? '3 days ago' : undefined) ??
        day.charAt(0).toUpperCase() + day.slice(1),
    ] as const
  ),
  posters: [['show', 'Show'], ['season', 'Season']],
  bars: [[false, 'Exact progress bar with episode segments'], [true, 'Standard progress bar']],
  refresh: [[false, "No, I'll refresh the next episode myself"], [true, 'Yes, auto refresh the next episode']],
  progressRefresh: [[false, "No, I'll refresh the next episode myself"], [
    true,
    'Yes, auto refresh the show and next episode',
  ]],
  tabs: [['last_30_days', 'Last 30 Days'], ['all_time', 'All Time']],
  shows: [['plays', 'Play Count'], ['time', 'Time Watched']],
  movies: [['time', 'Time Watched'], ['plays', 'Play Count']],
  watchPopupAction: [
    ['ask', 'Ask for the specific date'],
    ['now', "Add with today's date (long press for a specific date)"],
    ['released', 'Add with release date (long press for a specific date)'],
    ['unknown', 'Add with unknown date (long press for a specific date)'],
  ],
  listPopupAction: [
    ['ask', 'Choose specific lists'],
    ['watchlist', 'Add to watchlist (long press to choose specific lists)'],
  ],
  watchAfterRating: [
    ['', "Don't automatically mark unwatched items after rating them"],
    ['now', "Automatically mark unwatched items with today's date"],
    ['released', 'Automatically mark unwatched items with release date'],
    ['unknown', 'Automatically mark unwatched items with unknown date'],
  ],
  episodeSpoilers: [
    ['show', 'Display screenshots + titles + overviews'],
    ['hide', 'Hide screenshots + blur titles + blur overviews'],
    ['hide_screenshots_overviews', 'Hide screenshots + blur overviews'],
    ['hide_screenshots', 'Hide screenshots'],
    ['hide_overviews', 'Blur overviews'],
  ],
  showSpoilers: [['show', 'Display overviews'], ['hide', 'Blur overviews']],
  movieSpoilers: [['show', 'Display overviews'], ['hide', 'Blur overviews']],
  commentSpoilers: [['show', 'Display comments'], ['hide', 'Blur comments']],
  ratingSpoilers: [['show', 'Display ratings'], ['hide', 'Blur ratings']],
  actorSpoilers: [['show', 'Display episode counts'], ['hide', 'Hide episode counts']],
} as const;
