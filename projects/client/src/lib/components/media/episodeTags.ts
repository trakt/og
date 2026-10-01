import type { EpisodeResponse } from '@trakt/api';
import type { ComponentProps } from 'svelte';
import type EpisodeTypeBadge from './EpisodeTypeBadge.svelte';

type EpisodeType = {
  text: string;
  kind: Exclude<ComponentProps<typeof EpisodeTypeBadge>['kind'], 'bonus' | 'trailer'>;
};

type Episode = Pick<EpisodeResponse, 'season' | 'number'> & {
  readonly episode_type?: string | null;
  readonly number_abs?: number | null;
};

const EPISODE_TYPES: Partial<Record<string, EpisodeType>> = {
  series_premiere: { text: 'Series Premiere', kind: 'series-premiere' },
  season_premiere: { text: 'Season Premiere', kind: 'season-premiere' },
  mid_season_premiere: { text: 'Mid Season Premiere', kind: 'mid-season-premiere' },
  mid_season_finale: { text: 'Mid Season Finale', kind: 'mid-season-finale' },
  season_finale: { text: 'Season Finale', kind: 'season-finale' },
  series_finale: { text: 'Series Finale', kind: 'series-finale' },
};

/**
 * OG's episode labels: a first episode is a premiere even when the data
 * doesn't say so. Standard episodes get no label.
 */
export function episodeType({ episode_type: type, season, number }: Episode): EpisodeType | undefined {
  if (type === 'series_premiere' || (season === 1 && number === 1)) return EPISODE_TYPES.series_premiere;
  if (type === 'season_premiere' || (season > 0 && number === 1)) return EPISODE_TYPES.season_premiere;
  return type ? EPISODE_TYPES[type] : undefined;
}

/** OG's `item_title` with `use_absolute` for anime and donghua: "3x03", "3x03 (669)", "Special 2". */
export function episodeNumber(episode: Episode, genres: readonly string[] | null | undefined): string {
  const { season, number, number_abs: absolute } = episode;
  const sxe = season === 0 ? `Special ${number}` : `${season}x${String(number).padStart(2, '0')}`;
  const useAbsolute = genres?.some((genre) => genre === 'anime' || genre === 'donghua');

  return useAbsolute && absolute ? `${sxe} (${absolute})` : sxe;
}
