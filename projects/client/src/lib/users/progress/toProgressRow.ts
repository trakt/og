import type { ComponentProps } from 'svelte';
import type FanartCard from '../../components/media/FanartCard.svelte';
import { episodeNumber, episodeType } from '../../components/media/episodeTags.ts';
import { progressPercent } from '../../components/media/progressPercent.ts';
import type { TickRun } from '../../components/media/TickRun.ts';
import { tickRuns } from '../../components/media/tickRuns.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { CatalogEpisode } from '../../shows/cache/ShowCatalog.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { formatRuntime } from '../../utils/formatRuntime.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { relativeDate } from '../../utils/relativeDate.ts';
import type { ProgressEpisodeData, ProgressItem, ProgressSeasonData } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];

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

/** The fanart card in an expanded row: the next episode, or the show once there's none. */
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
  /** "1d 3h", Watched only. "~" in front while it's an estimate from the show's runtime. */
  readonly watchedTime: string;
  readonly leftTime: string;
  /** The last watched (or collected) date, with the episode once the row is expanded. */
  readonly last?: {
    readonly number?: string;
    readonly title?: string;
    readonly href?: string;
    readonly relative?: string;
    readonly date: string;
  };
  /** "December 1, 2025" on the Dropped tab. */
  readonly droppedOn?: string;
  /** "July 2, 2024" while the show is being rewatched. */
  readonly rewatchingSince?: string;
  readonly seasons: readonly ProgressSeason[];
  readonly next?: ProgressNext;
};

type ToProgressRowParams = {
  item: ProgressItem;
  type: ProgressType;
  datePreferences: DatePreferences;
  now: Date;
};

const UNKNOWN_DATE = Date.parse('1970-01-01T00:00:00Z');
const isUnknown = (date: string) => Date.parse(date) === UNKNOWN_DATE;
const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;
const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());
const runtime = (minutes: number, exact: boolean) => `${exact ? '' : '~'}${formatRuntime(minutes)}`;

/** Without seasons, the watched share from the left, which is how the ticks look when episodes go in order. */
const countRuns = (completed: number, aired: number) =>
  tickRuns([
    ...Array.from({ length: Math.min(completed, aired) }, () => true),
    ...Array.from({ length: Math.max(aired - completed, 0) }, () => false),
  ]);

// OG's `season_title?`: a title that only restates the number isn't repeated after it.
const RESTATED = /^(season|special|temporada|stagione|saison|series|sezonul|staffel)/i;

function seasonTitle({ number, title }: ProgressSeasonData): string {
  const prefix = number === 0 ? 'Specials' : `Season ${number}`;
  if (!title || RESTATED.test(title)) return prefix;
  return `${prefix}: ${title}`;
}

type EpisodeParams = {
  episode: ProgressEpisodeData;
  season: number;
  showHref: string;
  type: ProgressType;
  datePreferences: DatePreferences;
};

function toEpisode({ episode, season, showHref, type, datePreferences }: EpisodeParams): ProgressEpisode {
  const label = `${season}x${String(episode.number).padStart(2, '0')}`;
  const { at, plays } = episode;

  return {
    key: label,
    label,
    href: `${showHref}/seasons/${season}/episodes/${episode.number}`,
    done: episode.done,
    ...(type !== 'library' && plays > 0 && {
      plays: { text: `${count(plays)} ${plural(plays, 'play')}`, detail: formatRuntime(episode.minutesWatched) },
    }),
    ...(at && {
      activity: {
        prefix: type === 'library' ? 'Added to library on' : 'Last watched on',
        date: isUnknown(at) ? 'Unknown date' : formatDate(at, { ...datePreferences, time: true }),
      },
    }),
  };
}

function seasonSummary(season: ProgressSeasonData, type: ProgressType): string {
  const episodes = `${count(season.completed)}/${count(season.aired)} episodes`;
  if (type === 'library') return episodes;

  const left = Math.max(season.aired - season.completed, 0);
  return [
    episodes,
    ...(season.plays > 0
      ? [`${count(season.plays)} ${plural(season.plays, 'play')} (${formatRuntime(season.minutesWatched)})`]
      : []),
    ...(season.minutesLeft > 0 ? [`${count(left)} remaining (${formatRuntime(season.minutesLeft)})`] : []),
  ].join(' — ');
}

function toSeason(season: ProgressSeasonData, params: Omit<EpisodeParams, 'episode' | 'season'>): ProgressSeason {
  return {
    number: season.number,
    title: seasonTitle(season),
    href: `${params.showHref}/seasons/${season.number}`,
    percent: progressPercent(season),
    ticks: tickRuns(season.episodes.map(({ done }) => done)),
    summary: seasonSummary(season, params.type),
    episodes: season.episodes.map((episode) => toEpisode({ ...params, episode, season: season.number })),
  };
}

/** The API's episode fields that `episodeType` and `episodeNumber` read. */
const tagged = (episode: CatalogEpisode) => ({
  season: episode.season,
  number: episode.number,
  episode_type: episode.type,
  number_abs: episode.numberAbs,
});

function toNext({ item, datePreferences }: ToProgressRowParams): ProgressNext {
  const { show, detail } = item;
  const showHref = `/shows/${show.slug}`;
  const episode = detail?.next;

  if (!episode) {
    // The API's ended status covers canceled shows too.
    const ended = show.status === 'ended' || show.status === 'canceled';
    return {
      href: showHref,
      title: show.title,
      year: show.year,
      image: imageUrl(show.fanart, 'medium'),
      tags: [{ text: ended && show.status ? titleCase(show.status) : 'Returns next season!' }],
      rating: show.rating,
      target: { type: 'show', id: show.id, title: show.title },
      airedEpisodes: item.aired,
    };
  }

  const label = episodeType(tagged(episode));
  const number = episodeNumber(tagged(episode), show.genres);
  return {
    href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
    title: episode.title ?? '',
    number,
    image: imageUrl(episode.screenshot ?? show.fanart, 'medium'),
    tags: [
      ...(label ? [label] : []),
      ...(episode.firstAired
        ? [{ text: formatDate(episode.firstAired, { ...datePreferences, time: true }), kind: 'primary' as const }]
        : []),
    ],
    rating: episode.rating,
    target: { type: 'episode', id: episode.id, title: `${show.title} ${number}` },
    season: { show: show.id, number: episode.season, episode: episode.number },
  };
}

function toLast({ item, datePreferences, now }: ToProgressRowParams, showHref: string): ProgressRow['last'] {
  const at = item.lastAt;
  if (!at) return undefined;

  const episode = item.detail?.last;
  const unknown = isUnknown(at);
  return {
    ...(episode && {
      number: episodeNumber(tagged(episode), item.show.genres),
      title: episode.title ? `"${episode.title}"` : undefined,
      href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
    }),
    relative: unknown ? undefined : relativeDate(at, now),
    date: unknown ? 'Unknown date' : formatDate(at, { ...datePreferences, time: true }),
  };
}

/** Maps a show's progress onto OG's row: poster, tick bar, counts, and, once expanded, seasons and the next episode. */
export function toProgressRow(params: ToProgressRowParams): ProgressRow {
  const { item, type, datePreferences } = params;
  const { show, detail } = item;
  const href = `/shows/${show.slug}`;
  const seasons = detail?.seasons ?? [];
  const episodeStates = seasons.flatMap(({ episodes }) => episodes.map(({ done }) => done));

  return {
    id: show.id,
    title: show.title,
    href,
    poster: imageUrl(show.poster, 'thumb'),
    percent: progressPercent(item),
    ticks: episodeStates.length > 0 ? tickRuns(episodeStates) : countRuns(item.completed, item.aired),
    aired: item.aired,
    completed: item.completed,
    left: Math.max(item.aired - item.completed, 0),
    plays: item.plays,
    watchedTime: runtime(item.minutesWatched, item.exact),
    leftTime: runtime(item.minutesLeft, item.exact),
    last: toLast(params, href),
    droppedOn: item.droppedAt ? formatDate(item.droppedAt, { ...datePreferences, format: 'LL' }) : undefined,
    rewatchingSince: type !== 'library' && item.resetAt
      ? formatDate(item.resetAt, { ...datePreferences, format: 'LL' })
      : undefined,
    seasons: seasons.map((season) => toSeason(season, { showHref: href, type, datePreferences })),
    next: detail ? toNext(params) : undefined,
  };
}
