import type { AdvancedFilters, ListFilterKey, RangeFilterKey } from './advancedFilters.ts';
import { listFilterKeys } from './advancedFilters.ts';

/** The rating site whose logo leads a range tag. */
export type TagSite = 'trakt' | 'imdb' | 'rt' | 'rt-audience';

export type FilterTag = {
  readonly id: string;
  readonly text: string;
  /** Excluded with "none": OG struck these through. */
  readonly without: boolean;
  readonly site?: TagSite;
};

const titleCase = (value: string) =>
  value.split(/[-_\s]+/).filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');

const displayName = (type: 'language' | 'region', code: string) => {
  try {
    const name = new Intl.DisplayNames(['en'], { type }).of(type === 'region' ? code.toUpperCase() : code);
    return name && name.toLowerCase() !== code.toLowerCase() ? name : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
};

/**
 * How OG named a filter value: genres and statuses title-cased,
 * certifications upper-cased, languages and countries by their English names, networks as they are.
 */
export function filterValueLabel(key: ListFilterKey, value: string): string {
  switch (key) {
    case 'genres':
    case 'status':
    case 'episode_types':
      return titleCase(value);
    case 'certifications':
      return value.toUpperCase();
    case 'languages':
      return displayName('language', value);
    case 'countries':
      return displayName('region', value);
    case 'networks':
      return value;
  }
}

const ranges: readonly { key: RangeFilterKey; site?: TagSite; suffix: string; decimals?: number }[] = [
  { key: 'years', suffix: '' },
  { key: 'runtimes', suffix: ' mins' },
  { key: 'ratings', site: 'trakt', suffix: '%' },
  { key: 'imdb_ratings', site: 'imdb', suffix: '', decimals: 1 },
  { key: 'rt_meters', site: 'rt', suffix: '%' },
  { key: 'rt_user_meters', site: 'rt-audience', suffix: '%' },
];

/** The sidebar's applied-filter tags in OG's order. Watch now shows as service tiles instead. */
export function filterTags(filters: AdvancedFilters): FilterTag[] {
  const lists = listFilterKeys.flatMap((key) =>
    filters[key].values.map((value) => ({
      id: `${key}-${value}`,
      text: filterValueLabel(key, value),
      without: filters[key].mode === 'none',
    }))
  );
  const bounds = ranges.flatMap(({ key, site, suffix, decimals }) => {
    const range = filters[key];
    if (!range) return [];
    const [min, max] = range.map((value) => decimals ? value.toFixed(decimals) : `${value}`);
    return [{ id: key, text: `${min} - ${max}${suffix}`, without: false, ...(site && { site }) }];
  });

  const terms: FilterTag[] = filters.query ? [{ id: 'query', text: filters.query, without: false }] : [];
  return [...terms, ...lists, ...bounds];
}
