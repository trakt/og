import type { AdvancedFiltersConfig } from '../components/filters/AdvancedFiltersConfig.ts';
import type { ListFilterKey, RangeFilterKey } from '../components/filters/advancedFilters.ts';
import { filterRanges } from '../components/filters/filterRanges.ts';
import type { ChartName } from './chartNames.ts';
import { isPeriodChart } from './chartNames.ts';
import type { ChartPeriod } from './chartPeriod.ts';
import type { MediaType } from './loadChart.ts';

/** OG's period options labels. */
const periodOptions = [
  { value: 'daily', label: 'Last Day' },
  { value: 'weekly', label: 'Last 7 Days' },
  { value: 'monthly', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

/** Recommendations kept only watch now, genres, years and the Trakt rating. */
export const recommendationFilters = { watchnow: true, genres: true, years: true, ratings: true } as const;

type ChartFiltersParams = { type: MediaType; chart: ChartName; period: ChartPeriod; now: Date };

/**
 * The advanced filter panel for one chart. Filter Terms, Studios, TMDB, Metacritic and the vote sliders
 * are cut: the API has no filter for them.
 */
export function chartFilters({ type, chart, period, now }: ChartFiltersParams): AdvancedFiltersConfig {
  const scales = filterRanges({ now, upcoming: chart === 'anticipated' });
  const base = {
    type,
    watchnow: true,
    scales,
    ...(isPeriodChart(chart) && { period: { value: period, options: periodOptions } }),
  };
  if (chart === 'recommendations') return { ...base, lists: ['genres'], ranges: ['years', 'ratings'] };

  const lists: ListFilterKey[] = type === 'shows'
    ? ['genres', 'certifications', 'languages', 'countries', 'networks', 'status']
    : ['genres', 'certifications', 'languages', 'countries'];
  const ranges: RangeFilterKey[] = ['years', 'runtimes', 'ratings', 'imdb_ratings', 'rt_meters', 'rt_user_meters'];
  return { ...base, lists, ranges };
}
