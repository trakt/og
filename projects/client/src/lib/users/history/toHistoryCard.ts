import { watchDateInput } from '../../components/history/watchDateInput.ts';
import { episodeNumber } from '../../components/media/episodeTags.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { episodeBadge, type WatchedCard } from '../profile/toProfileSummary.ts';
import type { HistoryItem } from './historyFilters.ts';
import type { HistoryRow, WatchedShowRow } from './historyRowsSchema.ts';

/** One poster card in the history grid. */
export type HistoryCard = {
  /** The play's history id, or the show's id on the Shows tab. */
  readonly key: number;
  readonly type: 'movie' | 'show' | 'episode';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  readonly number?: string;
  readonly image?: string;
  readonly variant: 'poster' | 'screenshot';
  readonly rating?: number;
  readonly airedEpisodes?: number;
  readonly season?: { readonly show: number; readonly number: number; readonly episode: number };
  readonly episodeBadge?: WatchedCard['episodeBadge'];
  /** The show over a screenshot card's date, linked to the show. */
  readonly show?: { readonly text: string; readonly href: string };
  readonly watchedAt: string;
  readonly watchedDate: string;
  /** Minutes, for the day's total. */
  readonly runtime: number;
};

/** A day divider and the cards under it . */
export type HistoryDay<Card = HistoryCard> = {
  readonly key: string;
  /** "Tuesday", or undefined for plays with an unknown date. */
  readonly weekday?: string;
  /** "September 29, 2026", or "Unknown Date". */
  readonly date: string;
  readonly runtime: number;
  readonly cards: readonly Card[];
};

// OG's UNKNOWN_WATCHED_DATE.
const UNKNOWN = Date.parse('1970-01-01T00:00:00Z');

const showHref = (slug: string) => `/shows/${slug}`;
const watchedDate = (at: string, datePreferences: DatePreferences) =>
  formatDate(at, { ...datePreferences, time: true });

/**
 * A play as a card. `screenshots` is OG's episode layout, for the Episodes tab and one show, season or episode: the
 * still, then the show and the date. Otherwise an episode shows its show's poster with the episode under it.
 */
export function toHistoryCard(
  row: HistoryRow,
  { screenshots, datePreferences }: { screenshots: boolean; datePreferences: DatePreferences },
): HistoryCard {
  const common = {
    key: row.id,
    watchedAt: row.watched_at,
    watchedDate: watchedDate(row.watched_at, datePreferences),
  };
  if ('movie' in row) {
    const { movie } = row;
    return {
      ...common,
      type: 'movie',
      id: movie.ids.trakt,
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      image: imageUrl(movie.images?.poster?.at(0), 'thumb'),
      variant: 'poster',
      rating: movie.rating ?? undefined,
      runtime: movie.runtime ?? 0,
    };
  }

  const { episode, show } = row;
  return {
    ...common,
    type: 'episode',
    season: { show: show.ids.trakt, number: episode.season, episode: episode.number },
    id: episode.ids.trakt,
    href: `${showHref(show.ids.slug)}/seasons/${episode.season}/episodes/${episode.number}`,
    title: episode.title ?? '',
    number: episodeNumber(episode, show.genres),
    image: imageUrl((screenshots ? episode.images?.screenshot : show.images?.poster)?.at(0), 'thumb'),
    variant: screenshots ? 'screenshot' : 'poster',
    rating: episode.rating ?? undefined,
    episodeBadge: episodeBadge(episode),
    ...(screenshots && { show: { text: show.title, href: showHref(show.ids.slug) } }),
    runtime: episode.runtime ?? show.runtime ?? 0,
  };
}

/** A Shows tab card: the show, last watched under the title. */
export function toWatchedShowCard(row: WatchedShowRow, datePreferences: DatePreferences): HistoryCard {
  const { show } = row;
  return {
    key: show.ids.trakt,
    type: 'show',
    id: show.ids.trakt,
    href: showHref(show.ids.slug),
    title: show.title,
    image: imageUrl(show.images?.poster?.at(0), 'thumb'),
    variant: 'poster',
    rating: show.rating ?? undefined,
    airedEpisodes: show.aired_episodes ?? undefined,
    watchedAt: row.last_watched_at,
    watchedDate: watchedDate(row.last_watched_at, datePreferences),
    runtime: 0,
  };
}

/**
 * The Shows tab from filtered plays: each show once, at its newest play, in the order they came (newest first).
 * OG's "charts mode".
 */
export function toShowsFromPlays(rows: readonly HistoryRow[]): WatchedShowRow[] {
  const seen = new Map<number, WatchedShowRow>();
  for (const row of rows) {
    if (!('show' in row)) continue;
    const found = seen.get(row.show.ids.trakt);
    if (found) seen.set(row.show.ids.trakt, { ...found, plays: found.plays + 1 });
    else seen.set(row.show.ids.trakt, { plays: 1, last_watched_at: row.watched_at, show: row.show });
  }
  return [...seen.values()];
}

/** Cards grouped under one divider a day, in the viewer's zone, with the day's runtime. */
export function toHistoryDays<Card extends Pick<HistoryCard, 'watchedAt' | 'runtime'>>(
  cards: readonly Card[],
  datePreferences: DatePreferences,
): HistoryDay<Card>[] {
  const days: HistoryDay<Card>[] = [];
  for (const card of cards) {
    const unknown = Date.parse(card.watchedAt) === UNKNOWN;
    const key = unknown ? 'unknown' : watchDateInput(new Date(card.watchedAt), datePreferences.timeZone).slice(0, 10);
    const last = days.at(-1);
    if (last?.key === key) {
      days[days.length - 1] = { ...last, runtime: last.runtime + card.runtime, cards: [...last.cards, card] };
      continue;
    }
    days.push({
      key,
      ...(!unknown && { weekday: formatDate(card.watchedAt, { ...datePreferences, format: 'dddd' }) }),
      date: unknown ? 'Unknown Date' : formatDate(card.watchedAt, { ...datePreferences, format: 'LL' }),
      runtime: card.runtime,
      cards: [card],
    });
  }
  return days;
}

const seasonName = (number: number) => (number === 0 ? 'Specials' : `Season ${number}`);

/** OG's `full_title` of the one item, for the type dropdown's label. */
export function historyItemTitle(item: HistoryItem, row: HistoryRow | undefined): string | undefined {
  if (!row) return undefined;
  if ('movie' in row) return row.movie.year ? `${row.movie.title} (${row.movie.year})` : row.movie.title;
  const { show, episode } = row;
  if (item.type === 'show') return show.title;
  if (item.type === 'season') return `${show.title} ${seasonName(episode.season)}`;
  const number = episode.season === 0
    ? `Special ${episode.number}`
    : `${episode.season}x${String(episode.number).padStart(2, '0')}`;
  return `${show.title} ${number}${episode.title ? ` "${episode.title}"` : ''}`;
}
