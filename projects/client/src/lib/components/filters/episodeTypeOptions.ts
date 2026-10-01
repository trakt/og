import type { FilterOption } from './filterOptions.ts';

/** OG's Episode.episode_types, in its panel order. */
export const episodeTypeOptions: readonly FilterOption[] = [
  'standard',
  'series_premiere',
  'season_premiere',
  'mid_season_finale',
  'mid_season_premiere',
  'season_finale',
  'series_finale',
].map((value) => ({ value, label: value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }));
