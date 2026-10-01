import type { RangeFilterKey } from './advancedFilters.ts';
import { linearScale, type RangeScale } from './rangeScale.ts';

type FilterRangesParams = {
  /** For the year slider's upper end: this year + 5, or + 10 on anticipated. */
  now: Date;
  /** Anticipated's year slider runs from this year to this year + 10. */
  upcoming?: boolean;
};

/**
 * Each range slider's scale (`advanced_filters.js:76-240`): the year and runtime sliders stretch the busy middle of
 * their range, the rating sliders are linear. A range is only applied when it differs from these ends.
 */
export function filterRanges({ now, upcoming = false }: FilterRangesParams): Record<RangeFilterKey, RangeScale> {
  const year = now.getFullYear();
  return {
    years: upcoming ? linearScale(year, year + 10) : {
      stops: [[0, 1880], [15, 1920], [30, 1960], [50, 1975], [75, 2000], [100, year + 5]],
      step: 1,
    },
    runtimes: { stops: [[0, 0], [20, 30], [40, 60], [60, 90], [80, 120], [100, 500]], step: 1 },
    ratings: linearScale(0, 100),
    imdb_ratings: linearScale(0, 10, 0.1),
    rt_meters: linearScale(0, 100),
    rt_user_meters: linearScale(0, 100),
  };
}
