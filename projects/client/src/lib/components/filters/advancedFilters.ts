/**
 * OG's advanced filters as they live in the URL: `advanced_filters.js` wrote them and
 * read them back. List filters keep OG's prefixes: `+` on every value means "all"
 * (genres only), `-` means "none". Ranges are `min-max`.
 *
 * og names two params differently: `networks` carries names instead of OG's `network_ids`, because the API filters
 * networks by name, and `status` stays OG's name for the API's `statuses`.
 */

export type ListMode = 'any' | 'all' | 'none';

export type ListFilter = { readonly values: readonly string[]; readonly mode: ListMode };

export type Range = readonly [number, number];

export const listFilterKeys = [
  'genres',
  'certifications',
  'languages',
  'countries',
  'networks',
  'status',
  'episode_types',
] as const;
export type ListFilterKey = (typeof listFilterKeys)[number];

export const rangeFilterKeys = ['years', 'runtimes', 'ratings', 'imdb_ratings', 'rt_meters', 'rt_user_meters'] as const;
export type RangeFilterKey = (typeof rangeFilterKeys)[number];

export type AdvancedFilters =
  & { readonly watchnow: readonly string[]; readonly query: string }
  & { readonly [key in ListFilterKey]: ListFilter }
  & { readonly [key in RangeFilterKey]: Range | null };

const noList: ListFilter = { values: [], mode: 'any' };

export const emptyFilters: AdvancedFilters = {
  watchnow: [],
  query: '',
  ...Object.fromEntries(listFilterKeys.map((key) => [key, noList])) as { [key in ListFilterKey]: ListFilter },
  ...Object.fromEntries(rangeFilterKeys.map((key) => [key, null])) as { [key in RangeFilterKey]: null },
};

const split = (param: string | null) =>
  (param ?? '').split(',').map((value) => value.trimEnd()).filter((value) => value.trim() !== '');

// A literal `+` in a query string decodes to a space, so OG's "all" prefix arrives as a leading space. API
// checked for it the same way (`searcher_conjunction_select`).
const hasAllPrefix = (value: string) => value.startsWith('+') || value.startsWith(' ');

function parseList(param: string | null): ListFilter {
  const raw = split(param);
  const mode: ListMode = raw.some((value) => value.startsWith('-')) ? 'none' : raw.some(hasAllPrefix) ? 'all' : 'any';
  const values = [...new Set(raw.map((value) => value.replace(/^[-+ ]+/, '').trim()).filter(Boolean))];
  return values.length > 0 ? { values, mode } : noList;
}

function parseRange(param: string | null): Range | null {
  const match = /^\s*(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*$/.exec(param ?? '');
  if (!match) return null;

  const min = Number(match[1]);
  const max = Number(match[2]);
  return min <= max ? [min, max] : [max, min];
}

/** The filters in a chart URL's query. Anything malformed is dropped, so the chart renders unfiltered. */
export function parseAdvancedFilters(search: URLSearchParams): AdvancedFilters {
  const query = search.get('query')?.trim() ?? '';
  return {
    query: query === '*' ? '' : query,
    watchnow: [...new Set(split(search.get('watchnow')).map((value) => value.trim().toLowerCase()))],
    ...Object.fromEntries(listFilterKeys.map((key) => [key, parseList(search.get(key))])) as {
      [key in ListFilterKey]: ListFilter;
    },
    ...Object.fromEntries(rangeFilterKeys.map((key) => [key, parseRange(search.get(key))])) as {
      [key in RangeFilterKey]: Range | null;
    },
  };
}

const prefix = { any: '', all: '+', none: '-' } as const;

// OG's redirect left the commas and the `+` prefix unescaped, so the URL reads `genres=+drama,+comedy`
// (advanced_filters.js:366). A `+` inside a value ("Disney+") stays escaped, or it would read back as a space.
const encodeList = (values: readonly string[], mode: ListMode) =>
  values.map((value) => prefix[mode] + encodeURIComponent(value)).join(',');

const formatNumber = (value: number, key: RangeFilterKey) => key === 'imdb_ratings' ? value.toFixed(1) : `${value}`;

/** The query string for these filters (no `?`), in OG's param order. Empty when nothing is filtered. */
export function advancedFiltersSearch(filters: AdvancedFilters): string {
  const lists = listFilterKeys.flatMap((key) => {
    const { values, mode } = filters[key];
    return values.length > 0 ? [[key, encodeList(values, mode)]] : [];
  });
  const ranges = rangeFilterKeys.flatMap((key) => {
    const range = filters[key];
    return range ? [[key, `${formatNumber(range[0], key)}-${formatNumber(range[1], key)}`]] : [];
  });
  const watchnow = filters.watchnow.length > 0 ? [['watchnow', encodeList(filters.watchnow, 'any')]] : [];

  const terms = filters.query ? [['query', encodeURIComponent(filters.query)]] : [];
  return [...terms, ...watchnow, ...lists, ...ranges].map(([key, value]) => `${key}=${value}`).join('&');
}

/** Something is filtered. OG's `@advanced_filters_on`, plus watch now. */
export const hasAdvancedFilters = (filters: AdvancedFilters) => advancedFiltersSearch(filters) !== '';
