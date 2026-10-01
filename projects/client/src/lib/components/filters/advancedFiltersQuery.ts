import type { AdvancedFilters, ListFilterKey, RangeFilterKey } from './advancedFilters.ts';

/** The API's name for each list filter. */
const listParams: Record<Exclude<ListFilterKey, 'episode_types'>, string> = {
  genres: 'genres',
  certifications: 'certifications',
  languages: 'languages',
  countries: 'countries',
  networks: 'networks',
  status: 'statuses',
};

const rangeParams: Record<RangeFilterKey, string> = {
  years: 'years',
  runtimes: 'runtimes',
  ratings: 'ratings',
  imdb_ratings: 'imdb_ratings',
  rt_meters: 'rt_meters',
  rt_user_meters: 'rt_user_meters',
};

type Picked = { readonly [key: string]: boolean | undefined };

/**
 * The query the chart endpoints take for these filters. The API excludes with a `-` prefix like OG, but spells
 * "all" as `genres_operator=and` instead of OG's `+`. `only` keeps a subset: recommendations offered OG only
 * watch now, genres, years and the Trakt rating.
 */
export function advancedFiltersQuery(filters: AdvancedFilters, only?: Picked): Record<string, string> {
  const keep = (key: string) => !only || only[key] === true;

  const lists = (Object.keys(listParams) as (keyof typeof listParams)[]).filter(keep).flatMap((key) => {
    const { values, mode } = filters[key];
    if (values.length === 0) return [];
    const list: [string, string] = [
      listParams[key],
      values.map((value) => mode === 'none' ? `-${value}` : value).join(','),
    ];
    return key === 'genres' && mode === 'all' ? [list, ['genres_operator', 'and'] as [string, string]] : [list];
  });
  const ranges = (Object.keys(rangeParams) as RangeFilterKey[]).filter(keep).flatMap((key) => {
    const range = filters[key];
    return range ? [[rangeParams[key], `${range[0]}-${range[1]}`] as [string, string]] : [];
  });
  const watchnow: [string, string][] = keep('watchnow') && filters.watchnow.length > 0
    ? [['watchnow', filters.watchnow.join(',')]]
    : [];

  return Object.fromEntries([...watchnow, ...lists, ...ranges]);
}
