import type { ComponentProps } from 'svelte';
import type FanartCard from '../../components/media/FanartCard.svelte';
import { episodeNumber, episodeType } from '../../components/media/episodeTags.ts';
import { progressPercent } from '../../components/media/progressPercent.ts';
import type { TickRun } from '../../components/media/TickRun.ts';
import { tickRuns } from '../../components/media/tickRuns.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { formatRuntime } from '../../utils/formatRuntime.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { relativeDate } from '../../utils/relativeDate.ts';
import type { ProgressRowData } from './progressRowsSchema.ts';
import type { ProgressType } from './progressTypes.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];
type SeasonData = NonNullable<ProgressRowData['progress']['seasons']>[number];
type EpisodeData = SeasonData['episodes'][number];

/** One "1x05" chip under an open season, with its tooltip. */
export type ProgressEpisode = {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly done: boolean;
  /** "3 plays", with its time watched after a dash. Watched only. */
  readonly plays?: { readonly text: string; readonly detail: string };
  /** "Last watched on" or "Added to library on", then the date. */
  readonly activity?: { readonly prefix: string; readonly date: string };
};

export type ProgressSeason = {
  readonly number: number;
  /** "Season 2", "Season 2: The Return" or "Specials". */
  readonly title: string;
  readonly href: string;
  readonly percent: number;
  readonly ticks: readonly TickRun[];
  /** "8/8 episodes — 8 plays (6h 6m) — 2 remaining (1h 30m)". */
  readonly summary: string;
  readonly episodes: readonly ProgressEpisode[];
};

/** The fanart card on a row's right: the next episode, or the show once there's none. */
export type ProgressNext = {
  readonly href: string;
  readonly title: string;
  readonly year?: number;
  readonly number?: string;
  readonly image?: string;
  readonly tags: readonly Tag[];
  readonly rating?: number;
  readonly target: { readonly type: 'episode' | 'show'; readonly id: number; readonly title: string };
  readonly season?: { readonly show: number; readonly number: number; readonly episode: number };
  readonly airedEpisodes?: number;
};

/** One show on the progress page. */
export type ProgressRow = {
  readonly id: number;
  readonly title: string;
  readonly href: string;
  readonly poster?: string;
  readonly percent: number;
  readonly ticks: readonly TickRun[];
  readonly aired: number;
  readonly completed: number;
  readonly left: number;
  readonly plays: number;
  /** "1d 3h", Watched only. */
  readonly watchedTime: string;
  readonly leftTime: string;
  /** The last watched (or collected) episode, with when. */
  readonly last?: {
    readonly number: string;
    readonly title?: string;
    readonly href: string;
    readonly relative?: string;
    readonly date: string;
  };
  /** "December 1, 2025" on the Dropped tab. */
  readonly droppedOn?: string;
  /** "July 2, 2024" while the show is being rewatched. */
  readonly rewatchingSince?: string;
  readonly seasons: readonly ProgressSeason[];
  readonly next: ProgressNext;
};

type ToProgressRowParams = {
  row: ProgressRowData;
  type: ProgressType;
  datePreferences: DatePreferences;
  now: Date;
  /** When you dropped the show, on the Dropped tab (`/users/hidden/dropped` `hidden_at`). */
  droppedAt?: string;
};

const UNKNOWN_DATE = Date.parse('1970-01-01T00:00:00Z');
const isUnknown = (date: string) => Date.parse(date) === UNKNOWN_DATE;
const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;
const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Without seasons, the watched share from the left, which is how the ticks look when episodes go in order. */
const countRuns = (completed: number, aired: number) =>
  tickRuns([
    ...Array.from({ length: Math.min(completed, aired) }, () => true),
    ...Array.from({ length: Math.max(aired - completed, 0) }, () => false),
  ]);

// OG's `season_title?`: a title that only restates the number isn't repeated after it.
const RESTATED = /^(season|special|temporada|stagione|saison|series|sezonul|staffel)/i;

function seasonTitle({ number, title }: SeasonData): string {
  const prefix = number === 0 ? 'Specials' : `Season ${number}`;
  if (!title || RESTATED.test(title)) return prefix;
  return `${prefix}: ${title}`;
}

type EpisodeParams = {
  episode: EpisodeData;
  season: number;
  showHref: string;
  type: ProgressType;
  datePreferences: DatePreferences;
};

function toEpisode({ episode, season, showHref, type, datePreferences }: EpisodeParams): ProgressEpisode {
  const label = `${season}x${String(episode.number).padStart(2, '0')}`;
  const at = type === 'watched' ? episode.last_watched_at : episode.collected_at;
  const playCount = episode.stats?.play_count ?? 0;

  return {
    key: label,
    label,
    href: `${showHref}/seasons/${season}/episodes/${episode.number}`,
    done: episode.completed,
    ...(type === 'watched' && playCount > 0 && {
      plays: {
        text: `${count(playCount)} ${plural(playCount, 'play')}`,
        detail: formatRuntime(episode.stats?.minutes_watched),
      },
    }),
    ...(at && {
      activity: {
        prefix: type === 'watched' ? 'Last watched on' : 'Added to library on',
        date: isUnknown(at) ? 'Unknown date' : formatDate(at, { ...datePreferences, time: true }),
      },
    }),
  };
}

function seasonSummary(season: SeasonData, type: ProgressType): string {
  const episodes = `${count(season.completed)}/${count(season.aired)} episodes`;
  if (type === 'library') return episodes;

  const plays = season.stats?.play_count ?? 0;
  const minutesLeft = season.stats?.minutes_left ?? 0;
  const left = Math.max(season.aired - season.completed, 0);
  return [
    episodes,
    ...(plays > 0
      ? [`${count(plays)} ${plural(plays, 'play')} (${formatRuntime(season.stats?.minutes_watched)})`]
      : []),
    ...(minutesLeft > 0 ? [`${count(left)} remaining (${formatRuntime(minutesLeft)})`] : []),
  ].join(' — ');
}

function toSeason(season: SeasonData, params: Omit<EpisodeParams, 'episode' | 'season'>): ProgressSeason {
  return {
    number: season.number,
    title: seasonTitle(season),
    href: `${params.showHref}/seasons/${season.number}`,
    percent: progressPercent(season),
    ticks: tickRuns(season.episodes.map(({ completed }) => completed)),
    summary: seasonSummary(season, params.type),
    episodes: season.episodes.map((episode) => toEpisode({ ...params, episode, season: season.number })),
  };
}

function toNext(row: ProgressRowData, datePreferences: DatePreferences): ProgressNext {
  const { show, progress } = row;
  const showHref = `/shows/${show.ids.slug}`;
  const episode = progress.next_episode;

  if (!episode) {
    // API's ended status covers canceled shows too.
    const ended = show.status === 'ended' || show.status === 'canceled';
    return {
      href: showHref,
      title: show.title,
      year: show.year ?? undefined,
      image: imageUrl(show.images?.fanart?.at(0), 'medium'),
      tags: [{ text: ended && show.status ? titleCase(show.status) : 'Returns next season!' }],
      rating: show.rating ?? undefined,
      target: { type: 'show', id: show.ids.trakt, title: show.title },
      airedEpisodes: progress.aired,
    };
  }

  const label = episodeType(episode);
  const number = episodeNumber(episode, show.genres);
  return {
    href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
    title: episode.title ?? '',
    number,
    image: imageUrl(episode.images?.screenshot?.at(0) ?? show.images?.fanart?.at(0), 'medium'),
    tags: [
      ...(label ? [label] : []),
      ...(episode.first_aired
        ? [{ text: formatDate(episode.first_aired, { ...datePreferences, time: true }), kind: 'primary' as const }]
        : []),
    ],
    rating: episode.rating ?? undefined,
    target: { type: 'episode', id: episode.ids.trakt, title: `${show.title} ${number}` },
    season: { show: show.ids.trakt, number: episode.season, episode: episode.number },
  };
}

function toLast(
  { row, type, datePreferences, now }: ToProgressRowParams,
  showHref: string,
): ProgressRow['last'] {
  const episode = row.progress.last_episode;
  const at = type === 'watched' ? row.progress.last_watched_at : row.progress.last_collected_at;
  if (!episode || !at) return undefined;

  const unknown = isUnknown(at);
  return {
    number: episodeNumber(episode, row.show.genres),
    title: episode.title ? `"${episode.title}"` : undefined,
    href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
    relative: unknown ? undefined : relativeDate(at, now),
    date: unknown ? 'Unknown date' : formatDate(at, { ...datePreferences, time: true }),
  };
}

/** Maps a progress row onto OG's row: poster, tick bar, counts, seasons and the next episode's card. */
export function toProgressRow(params: ToProgressRowParams): ProgressRow {
  const { row, type, datePreferences, droppedAt } = params;
  const { show, progress } = row;
  const href = `/shows/${show.ids.slug}`;
  const seasons = progress.seasons ?? [];
  const episodeStates = seasons.flatMap(({ episodes }) => episodes.map(({ completed }) => completed));
  const left = Math.max(progress.aired - progress.completed, 0);

  return {
    id: show.ids.trakt,
    title: show.title,
    href,
    poster: imageUrl(show.images?.poster?.at(0), 'thumb'),
    percent: progressPercent(progress),
    ticks: episodeStates.length > 0 ? tickRuns(episodeStates) : countRuns(progress.completed, progress.aired),
    aired: progress.aired,
    completed: progress.completed,
    left,
    plays: progress.stats?.play_count ?? 0,
    watchedTime: formatRuntime(progress.stats?.minutes_watched),
    leftTime: formatRuntime(progress.stats?.minutes_left),
    last: toLast(params, href),
    droppedOn: droppedAt ? formatDate(droppedAt, { ...datePreferences, format: 'LL' }) : undefined,
    rewatchingSince: type === 'watched' && progress.reset_at
      ? formatDate(progress.reset_at, { ...datePreferences, format: 'LL' })
      : undefined,
    seasons: seasons.map((season) => toSeason(season, { showHref: href, type, datePreferences })),
    next: toNext(row, datePreferences),
  };
}
