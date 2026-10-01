import type { ComponentProps } from 'svelte';
import type FanartCard from '../components/media/FanartCard.svelte';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import type { FavoriteTarget } from '../favorites/FavoriteTarget.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { HistoryRow } from '../users/history/historyRowsSchema.ts';
import { formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];

/** One Recently Watched card. */
export type RecentPlay = {
  /** The play's history id. */
  readonly key: number;
  readonly type: 'movie' | 'episode';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  /** A movie's year, lighter after the title. */
  readonly year?: number;
  /** An episode's "3x03", bold before the title. */
  readonly number?: string;
  /** The show over an episode's title. */
  readonly smallTitle?: { readonly text: string; readonly href: string };
  readonly image?: string;
  /** The episode type, then the watched date and time, above the title. */
  readonly tags: readonly Tag[];
  /** The Trakt rating, 0 to 10. */
  readonly rating?: number;
  readonly runtime?: number;
  readonly season?: { readonly show: number; readonly number: number; readonly episode: number };
  /** The star: a movie, or an episode's show. */
  readonly favorite: FavoriteTarget;
  readonly watchedAt: string;
};

const showHref = (slug: string) => `/shows/${slug}`;

/**
 * A play as a fanart card: the watched date and time over the title (`format_date(allow_conversion: true)`), an
 * episode's type label before it (`premiere_label`), and the show as the small title. An episode's fanart is its
 * still, or the show's fanart without one.
 */
export function toRecentPlay(row: HistoryRow, datePreferences: DatePreferences): RecentPlay {
  const watched: Tag = { text: formatDate(row.watched_at, { ...datePreferences, time: true }) };
  const common = { key: row.id, watchedAt: row.watched_at };

  if ('movie' in row) {
    const { movie } = row;
    return {
      ...common,
      type: 'movie',
      id: movie.ids.trakt,
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      year: movie.year ?? undefined,
      image: imageUrl(movie.images?.fanart?.at(0), 'thumb'),
      tags: [watched],
      rating: movie.rating ?? undefined,
      runtime: movie.runtime ?? undefined,
      favorite: { type: 'movie', id: movie.ids.trakt, title: movie.title, year: movie.year },
    };
  }

  const { episode, show } = row;
  const label = episodeType(episode);
  return {
    ...common,
    type: 'episode',
    id: episode.ids.trakt,
    href: `${showHref(show.ids.slug)}/seasons/${episode.season}/episodes/${episode.number}`,
    title: episode.title ?? '',
    number: episodeNumber(episode, show.genres),
    smallTitle: { text: show.title, href: showHref(show.ids.slug) },
    image: imageUrl(episode.images?.screenshot?.at(0) ?? show.images?.fanart?.at(0), 'thumb'),
    tags: label ? [{ text: label.text, kind: label.kind }, watched] : [watched],
    rating: episode.rating ?? undefined,
    runtime: episode.runtime ?? show.runtime ?? undefined,
    season: { show: show.ids.trakt, number: episode.season, episode: episode.number },
    favorite: { type: 'show', id: show.ids.trakt, title: show.title, year: show.year },
  };
}
