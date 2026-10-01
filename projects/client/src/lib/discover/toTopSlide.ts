import type { MovieResponse, ShowResponse } from '@trakt/api';
import { imageUrl } from '../utils/imageUrl.ts';
import { readableStat } from '../utils/readableStat.ts';
import type { SlidePosterItem } from './SlidePosterItem.ts';

type Stats = { watcher_count: number; play_count: number; collected_count: number };

/** One `/shows|movies/watched/weekly` row. */
export type TopRow = ({ show: ShowResponse } | { movie: MovieResponse }) & Stats;

type Stat = { readonly value: string; readonly label: string };

export type TopSlide = SlidePosterItem & {
  readonly fanart?: string;
  /** Watchers, plays and libraries, abbreviated like OG's `readable_stat`. */
  readonly stats: readonly Stat[];
};

// API's plural labels: singular only for exactly 1.
const stat = (count: number, singular: string, plural: string): Stat => ({
  value: readableStat(count),
  label: count === 1 ? singular : plural,
});

/**
 * Maps a weekly watched row onto a discover slide. OG read the 7-day
 * `watcher_7_count`, `play_7_count` and `collected_7_count` columns; the weekly endpoint returns those same columns as
 * `watcher_count`, `play_count` and `collected_count`. For shows `collected_count` counts collected episodes, as OG's
 * "libraries" did, not `collector_count`'s owners.
 */
export function toTopSlide(row: TopRow, now: Date): TopSlide {
  const [type, media] = 'show' in row ? ['show' as const, row.show] : ['movie' as const, row.movie];
  const releaseDate = 'show' in row ? row.show.first_aired : row.movie.released;

  return {
    type,
    id: media.ids.trakt,
    href: `/${type}s/${media.ids.slug}`,
    title: media.title,
    fullTitle: media.year ? `${media.title} (${media.year})` : media.title,
    poster: imageUrl(media.images?.poster?.at(0), 'thumb'),
    fanart: imageUrl(media.images?.fanart?.at(0), 'medium'),
    released: releaseDate ? new Date(releaseDate) <= now : false,
    rating: media.rating ?? undefined,
    airedEpisodes: 'show' in row ? (row.show.aired_episodes ?? undefined) : undefined,
    runtime: media.runtime ?? undefined,
    stats: [
      stat(row.watcher_count, 'watcher', 'watchers'),
      stat(row.play_count, 'play', 'plays'),
      stat(row.collected_count, 'library', 'libraries'),
    ],
  };
}
