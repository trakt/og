import type { AdvancedFiltersConfig } from '../components/filters/AdvancedFiltersConfig.ts';
import { filterRanges } from '../components/filters/filterRanges.ts';

/** calendars reuse the chart panel, with local terms/types and no release-year or status filter. */
export function calendarFilters({ slug, now }: { slug: string; now: Date }): AdvancedFiltersConfig {
  const movie = ['movies', 'streaming', 'dvd'].includes(slug);
  const mixed = slug === 'shows-movies';
  return {
    type: movie ? 'movies' : 'shows',
    ...(mixed && { optionTypes: ['shows', 'movies'] as const }),
    watchnow: true,
    query: true,
    lists: [
      'genres',
      'certifications',
      'languages',
      'countries',
      ...(!movie ? ['networks', 'episode_types'] as const : []),
    ],
    ranges: [
      'runtimes',
      'ratings',
      'imdb_ratings',
      ...(movie || mixed ? ['rt_meters', 'rt_user_meters'] as const : []),
    ],
    scales: filterRanges({ now }),
  };
}
