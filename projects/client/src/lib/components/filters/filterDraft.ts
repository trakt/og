import type { AdvancedFiltersConfig } from './AdvancedFiltersConfig.ts';
import { type AdvancedFilters, emptyFilters, type Range, rangeFilterKeys } from './advancedFilters.ts';
import { scaleMax, scaleMin } from './rangeScale.ts';

/** What the panel's controls hold: every slider has a value, at its ends when that range isn't filtered. */
export type FilterDraft = Omit<AdvancedFilters, (typeof rangeFilterKeys)[number]> & {
  readonly ranges: Readonly<Record<(typeof rangeFilterKeys)[number], Range>>;
};

/** The panel's starting state for the applied filters. */
export function toFilterDraft(filters: AdvancedFilters, config: AdvancedFiltersConfig): FilterDraft {
  const ranges = Object.fromEntries(
    rangeFilterKeys.map((key) => {
      const scale = config.scales[key];
      return [key, filters[key] ?? [scaleMin(scale), scaleMax(scale)]];
    }),
  ) as FilterDraft['ranges'];
  const { watchnow, genres, certifications, languages, countries, networks, status, episode_types, query } = filters;
  return { watchnow, genres, certifications, languages, countries, networks, status, episode_types, query, ranges };
}

/**
 * The filters to apply from the panel. Only the page's own controls count, like OG's apply, and a range left at
 * its ends isn't sent (`advanced_filters.js:338-349`).
 */
export function fromFilterDraft(draft: FilterDraft, config: AdvancedFiltersConfig): AdvancedFilters {
  const lists = Object.fromEntries(config.lists.map((key) => [key, draft[key]]));
  const ranges = Object.fromEntries(
    config.ranges.flatMap((key) => {
      const scale = config.scales[key];
      const [min, max] = draft.ranges[key];
      return min === scaleMin(scale) && max === scaleMax(scale) ? [] : [[key, [min, max]]];
    }),
  );
  return {
    ...emptyFilters,
    ...(config.query && { query: draft.query.trim() }),
    ...(config.watchnow && { watchnow: draft.watchnow }),
    ...lists,
    ...ranges,
  };
}
