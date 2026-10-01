import { countLabel } from '../../utils/countLabel.ts';
import { formatRuntime } from '../../utils/formatRuntime.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { playRuntime } from '../playRuntime.ts';
import type { WatchedItemRow } from './watchedItemsSchema.ts';

type Media = {
  readonly ids: { readonly trakt: number; readonly slug: string };
  readonly title: string;
  readonly year?: number | null;
  readonly runtime?: number | null;
  readonly rating?: number | null;
  readonly aired_episodes?: number | null;
  readonly images?: { readonly poster?: readonly string[] | null } | null;
};

type HistoryRow =
  | { readonly watched_at: string; readonly episode: { readonly runtime?: number | null }; readonly show: Media }
  | { readonly watched_at: string; readonly movie: Media };

export type MostWatchedType = 'shows' | 'movies';

/** One poster in a Most Watched column. */
export type MostWatchedCard = {
  readonly type: 'show' | 'movie';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  readonly image?: string;
  readonly rating?: number;
  readonly airedEpisodes?: number;
  /** OG's `humanize_minutes`: "1d 16h 32m". */
  readonly time: string;
  /** "19 plays". */
  readonly plays: string;
};

export type MostWatchedSort = 'plays' | 'time';
export type MostWatchedTab = 'lastMonth' | 'allTime';

export type MostWatched = {
  readonly lastMonth: readonly MostWatchedCard[];
  readonly allTime: readonly MostWatchedCard[];
  /** The order, which the see-more link hands the history page. */
  readonly sortBy: MostWatchedSort;
  /** The tab that opens first. */
  readonly tab: MostWatchedTab;
};

/** The owner's saved sort and default tab (`browsing.profile.most_watched_*` in `/users/settings`). */
export type MostWatchedPrefs = {
  readonly sort_by: MostWatchedSort;
  readonly tab: 'last_30_days' | 'all_time';
};

type Tally = {
  readonly media: Media;
  readonly plays: number;
  readonly minutes: number;
  readonly lastWatchedAt: string;
};

const LIMIT = 3;

// OG's orders. By default shows go by plays and movies by time watched.
const byPlays = (a: Tally, b: Tally) => b.plays - a.plays || b.lastWatchedAt.localeCompare(a.lastWatchedAt);
const byTime = (a: Tally, b: Tally) => b.minutes - a.minutes || b.plays - a.plays;

function toCard(type: MostWatchedType, { media, plays, minutes }: Tally): MostWatchedCard {
  return {
    type: type === 'shows' ? 'show' : 'movie',
    id: media.ids.trakt,
    href: `/${type}/${media.ids.slug}`,
    title: media.title,
    image: imageUrl(media.images?.poster?.at(0), 'thumb'),
    rating: media.rating ?? undefined,
    airedEpisodes: type === 'shows' ? media.aired_episodes ?? undefined : undefined,
    time: formatRuntime(minutes),
    plays: countLabel(plays, 'play'),
  };
}

const DEFAULT_SORT: Readonly<Record<MostWatchedType, MostWatchedSort>> = { shows: 'plays', movies: 'time' };

const top = (type: MostWatchedType, sortBy: MostWatchedSort, tallies: readonly Tally[]) =>
  tallies.toSorted(sortBy === 'plays' ? byPlays : byTime).slice(0, LIMIT).map((tally) => toCard(type, tally));

// Last 30 Days: plays counted per show or movie, and every play's own runtime summed, like OG's charts query with
// `watched_at >= 30 days ago`.
function fromHistory(rows: readonly HistoryRow[]): Tally[] {
  const tallies = rows.reduce((map, row) => {
    const media = 'movie' in row ? row.movie : row.show;
    const runtime = playRuntime(row);
    const seen = map.get(media.ids.trakt);
    return map.set(media.ids.trakt, {
      media,
      plays: (seen?.plays ?? 0) + 1,
      minutes: (seen?.minutes ?? 0) + runtime,
      lastWatchedAt: seen && seen.lastWatchedAt > row.watched_at ? seen.lastWatchedAt : row.watched_at,
    });
  }, new Map<number, Tally>());

  return [...tallies.values()];
}

// All Time: a movie's time is its plays times its runtime, like OG's. A show row has no per-episode runtimes, so its
// time uses the show's runtime for every play.
function fromWatched(rows: readonly WatchedItemRow[]): Tally[] {
  return rows.map((row): Tally => {
    const [media, runtime] = 'movie' in row
      ? [row.movie, playRuntime({ movie: row.movie })]
      : [row.show, playRuntime({ episode: {}, show: row.show })];
    return { media, plays: row.plays, minutes: row.plays * runtime, lastWatchedAt: row.last_watched_at };
  });
}

/**
 * Both tabs of one Most Watched column: the top three of the last 30 days' history rows and of the whole watched
 * list. The worker has no sort for either, so they're tallied and sorted here. The owner's saved sort and tab apply
 * on their own profile only; everyone else gets OG's defaults.
 */
export function toMostWatched(
  type: MostWatchedType,
  { history, watched, prefs }: {
    history: readonly HistoryRow[];
    watched: readonly WatchedItemRow[];
    prefs?: MostWatchedPrefs | null;
  },
): MostWatched {
  const sortBy = prefs?.sort_by ?? DEFAULT_SORT[type];
  return {
    lastMonth: top(type, sortBy, fromHistory(history)),
    allTime: top(type, sortBy, fromWatched(watched)),
    sortBy,
    tab: prefs?.tab === 'all_time' ? 'allTime' : 'lastMonth',
  };
}
