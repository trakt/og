import type {
  EpisodeActivityHistoryResponse,
  FavoriteMovieResponse,
  FavoriteShowResponse,
  MovieActivityHistoryResponse,
} from '@trakt/api';
import { episodeNumber, episodeType } from '../../components/media/episodeTags.ts';
import type { OnDeckItem } from '../../components/media/OnDeckItem.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { imageUrl } from '../../utils/imageUrl.ts';

type EpisodeRow = Pick<EpisodeActivityHistoryResponse, 'id' | 'watched_at' | 'episode' | 'show'>;
type MovieRow = Pick<MovieActivityHistoryResponse, 'id' | 'watched_at' | 'movie'>;
type FavoriteRow = FavoriteShowResponse | FavoriteMovieResponse;

/** One card in the recently watched rows. */
export type WatchedCard = {
  /** The history row's id: the same item can be watched twice. */
  readonly key: number;
  readonly type: 'episode' | 'movie';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  /** An episode's "2x04", bold before its title. */
  readonly number?: string;
  readonly image?: string;
  readonly rating?: number;
  readonly episodeBadge?: OnDeckItem['episodeBadge'];
  /** The show under an episode's title, linked to the show. */
  readonly show?: { readonly text: string; readonly href: string };
  readonly watchedDate: string;
};

/** The Last Watched box. */
export type LastWatched = {
  readonly image?: string;
  readonly title: { readonly text: string; readonly href: string };
  /** An episode's own title under the show's. */
  readonly episode?: { readonly text: string; readonly href: string };
};

export type FavoriteCard = {
  readonly type: 'show' | 'movie';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  readonly typeLabel: 'Show' | 'Movie';
  readonly year?: number;
  readonly image?: string;
  readonly rating?: number;
  readonly airedEpisodes?: number;
  /** OG's `poster_gradient`, to when the poster has no colors. */
  readonly gradient: readonly [string, string];
  readonly notes: string | null;
};

export type WatchedTotals = { readonly minutes: number; readonly unique: number };

type BadgeKind = NonNullable<WatchedCard['episodeBadge']>['kind'];

// ponytail: the same narrowing lives in progress/toOnDeckItem.ts and users/notes/toNote.ts. Dedup into
// episodeTags.ts once nothing else is touching those files.
const BADGE_KINDS: ReadonlySet<string> = new Set<BadgeKind>([
  'series-premiere',
  'season-premiere',
  'mid-season-premiere',
  'mid-season-finale',
  'season-finale',
  'series-finale',
]);
const isBadgeKind = (kind: string): kind is BadgeKind => BADGE_KINDS.has(kind);

/** OG's premiere and finale banner over an episode's image. */
export function episodeBadge(episode: Parameters<typeof episodeType>[0]): WatchedCard['episodeBadge'] {
  const type = episodeType(episode);
  return type && isBadgeKind(type.kind) ? { label: type.text, kind: type.kind } : undefined;
}

const showHref = (show: EpisodeRow['show']) => `/shows/${show.ids.slug}`;
const episodeHref = ({ show, episode }: Pick<EpisodeRow, 'show' | 'episode'>) =>
  `${showHref(show)}/seasons/${episode.season}/episodes/${episode.number}`;

// OG's `item_title` for an episode: "2x04 Number the Stars", "Special 2 Title", or the number alone when untitled.
const episodeTitle = ({ show, episode }: Pick<EpisodeRow, 'show' | 'episode'>) =>
  [episodeNumber(episode, show.genres), episode.title].filter(Boolean).join(' ');

const watchedDate = (at: string, datePreferences: DatePreferences) =>
  formatDate(at, { ...datePreferences, time: true });

export function toWatchedEpisode(row: EpisodeRow, datePreferences: DatePreferences): WatchedCard {
  return {
    key: row.id,
    type: 'episode',
    id: row.episode.ids.trakt,
    href: episodeHref(row),
    number: episodeNumber(row.episode, row.show.genres),
    title: row.episode.title ?? '',
    image: imageUrl(row.episode.images?.screenshot?.at(0), 'thumb'),
    rating: row.episode.rating ?? undefined,
    episodeBadge: episodeBadge(row.episode),
    show: { text: row.show.title, href: showHref(row.show) },
    watchedDate: watchedDate(row.watched_at, datePreferences),
  };
}

export function toWatchedMovie(row: MovieRow, datePreferences: DatePreferences): WatchedCard {
  return {
    key: row.id,
    type: 'movie',
    id: row.movie.ids.trakt,
    href: `/movies/${row.movie.ids.slug}`,
    title: row.movie.title,
    image: imageUrl(row.movie.images?.poster?.at(0), 'thumb'),
    rating: row.movie.rating ?? undefined,
    watchedDate: watchedDate(row.watched_at, datePreferences),
  };
}

/** The newer of the latest episode and movie watch. For an episode OG shows the show's fanart and both titles. */
export function toLastWatched(episode: EpisodeRow | undefined, movie: MovieRow | undefined): LastWatched | null {
  if (episode && (!movie || episode.watched_at >= movie.watched_at)) {
    return {
      image: imageUrl(episode.show.images?.fanart?.at(0), 'thumb'),
      title: { text: episode.show.title, href: showHref(episode.show) },
      episode: { text: episodeTitle(episode), href: episodeHref(episode) },
    };
  }
  if (!movie) return null;
  return {
    image: imageUrl(movie.movie.images?.fanart?.at(0), 'thumb'),
    title: { text: movie.movie.title, href: `/movies/${movie.movie.ids.slug}` },
  };
}

export function toFavoriteCard(row: FavoriteRow): FavoriteCard {
  const [type, media] = row.type === 'show' ? ['show' as const, row.show] : ['movie' as const, row.movie];
  const [start = '#555', end = '#222'] = media.colors?.poster ?? [];

  return {
    type,
    id: media.ids.trakt,
    href: `/${type}s/${media.ids.slug}`,
    title: media.title,
    typeLabel: type === 'show' ? 'Show' : 'Movie',
    year: media.year ?? undefined,
    image: imageUrl(media.images?.poster?.at(0), 'thumb'),
    rating: media.rating ?? undefined,
    airedEpisodes: row.type === 'show' ? row.show.aired_episodes ?? undefined : undefined,
    gradient: [start, end],
    notes: row.notes?.trim() || null,
  };
}

/**
 * OG's `watched_minutes(days: 30)` and `watched_plays(days: 30)[:unique]` over a window of history rows: every
 * play's runtime (an episode without one uses its show's), and how many distinct items were played.
 */
export function toWatchedTotals(
  rows:
    readonly ({ episode: { ids: { trakt: number }; runtime?: number | null }; show: { runtime?: number | null } } | {
      movie: { ids: { trakt: number }; runtime?: number | null };
    })[],
): WatchedTotals {
  const ids = new Set<number>();
  let minutes = 0;
  for (const row of rows) {
    const media = 'movie' in row ? row.movie : row.episode;
    ids.add(media.ids.trakt);
    minutes += media.runtime ?? ('show' in row ? row.show.runtime ?? 0 : 0);
  }
  return { minutes, unique: ids.size };
}
