import type { ItemStats } from './ItemStats.ts';
import { statSorts } from './statSorts.ts';
import type { EpisodeResponse, ShowResponse } from '@trakt/api';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { countLabel } from '../utils/countLabel.ts';
import { formatDate } from '../utils/formatDate.ts';
import { formatRuntime } from '../utils/formatRuntime.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { SeasonWithEpisodes } from './loadShow.ts';

interface ShowEpisodesParams {
  show: ShowResponse;
  seasons: readonly SeasonWithEpisodes[];
  signedIn: boolean;
  /** Off when the viewer hides episode type tags ("Season Premiere"). */
  episodeTypeTags: boolean;
  datePreferences: DatePreferences;
  now: Date;
}

/** A row in an episode list, with what its sorts need. */
export type EpisodeRow = {
  id: number;
  href: string;
  /** "1x02", or "Special 2". */
  number: string;
  title: string;
  image?: string;
  spoilerImage?: string;
  type?: ReturnType<typeof episodeType>;
  /** "January 27, 2008 9:00 PM" in the page's zone, or undefined for "no air date". */
  aired?: string;
  runtime?: string;
  overview: string | null;
  comments: number;
  rating: number;
  released: boolean;
  votes: number;
  season: number;
  episode: number;
  /** ms since the epoch, or null without an air date. */
  airedAt: number | null;
};

export const EPISODE_SORTS = [
  { by: 'aired', name: 'Air Date', desc: false },
  { by: 'number', name: 'Number', desc: false },
  { by: 'percentage', name: 'Percentage', desc: true },
  { by: 'votes', name: 'Votes', desc: true },
  ...statSorts,
] as const;

export type EpisodeSort = (typeof EPISODE_SORTS)[number]['by'];

const sortKey: Record<Exclude<EpisodeSort, (typeof statSorts)[number]['by']>, (row: EpisodeRow) => number> = {
  // MySQL's ASC puts a missing date first, and OG's list came from `ORDER BY first_aired`.
  aired: (row) => row.airedAt ?? -Infinity,
  number: (row) => row.season * 10_000 + row.episode,
  // OG sorted on the integer percentage.
  percentage: (row) => Math.trunc(row.rating * 10),
  votes: (row) => row.votes,
};

const byAir = (a: EpisodeRow, b: EpisodeRow) =>
  sortKey.aired(a) - sortKey.aired(b) || a.season - b.season || a.episode - b.episode;

/** The rows in `by` order; `flipped` is the direction toggle. Ties fall back to air order. */
export function sortEpisodes({ rows, by, flipped, stats = new Map() }: {
  rows: readonly EpisodeRow[];
  by: EpisodeSort;
  flipped: boolean;
  stats?: ReadonlyMap<number, ItemStats | null>;
}): EpisodeRow[] {
  const desc = EPISODE_SORTS.find((sort) => sort.by === by)?.desc !== flipped;
  const field = statSorts.find((sort) => sort.by === by)?.field;
  const key = (row: EpisodeRow) => {
    if (field) return stats.get(row.id)?.[field] ?? 0;
    const local = by as keyof typeof sortKey;
    return sortKey[local](row);
  };
  return rows.toSorted((a, b) => (desc ? key(b) - key(a) : key(a) - key(b)) || byAir(a, b));
}

/** "2008 - 2010" from the first and last air years, "2008" for one, undefined without dates. */
export function yearRange(dates: readonly (string | null | undefined)[]): string | undefined {
  const years = dates.flatMap((date) => (date ? [new Date(date).getUTCFullYear()] : []));
  if (years.length === 0) return undefined;
  const [first, last] = [Math.min(...years), Math.max(...years)];
  return first === last ? `${first}` : `${first} - ${last}`;
}

/**
 * `/shows/:id/seasons/all`: every episode, specials too, in air order, plus the season
 * subnav (newest first, then All) and the arrows (previous is the last season, next the first).
 */
export function toShowEpisodes({ show, seasons, signedIn, episodeTypeTags, datePreferences, now }: ShowEpisodesParams) {
  const href = `/shows/${show.ids.slug}`;
  const timeZone = signedIn ? datePreferences.timeZone : show.airs?.timezone ?? datePreferences.timeZone;
  const seasonHref = (number: number) => `${href}/seasons/${number}`;
  const seasonName = (number: number) => (number === 0 ? 'Specials' : `Season ${number}`);
  const episodes: EpisodeResponse[] = seasons.flatMap((season) => season.episodes ?? []);

  const rows = episodes.map((episode): EpisodeRow => {
    const runtime = episode.runtime ?? show.runtime;
    return {
      id: episode.ids.trakt,
      href: `${seasonHref(episode.season)}/episodes/${episode.number}`,
      number: episodeNumber(episode, show.genres),
      title: episode.title ?? `Episode ${episode.number}`,
      image: imageUrl(episode.images?.screenshot?.at(0), 'thumb'),
      spoilerImage: imageUrl(show.images?.fanart?.at(0), 'thumb'),
      type: episodeTypeTags ? episodeType(episode) : undefined,
      aired: episode.first_aired
        ? formatDate(episode.first_aired, { ...datePreferences, timeZone, format: 'LL', time: true })
        : undefined,
      runtime: runtime ? formatRuntime(runtime) : undefined,
      overview: episode.overview ?? null,
      comments: episode.comment_count ?? 0,
      rating: episode.rating ?? 0,
      released: !!episode.first_aired && new Date(episode.first_aired) <= now,
      votes: episode.votes ?? 0,
      season: episode.season,
      episode: episode.number,
      airedAt: episode.first_aired ? new Date(episode.first_aired).getTime() : null,
    };
  });

  const numbers = seasons.map(({ number }) => number).toSorted((a, b) => a - b);
  const first = numbers.at(0);
  const last = numbers.at(-1);

  return {
    rows: rows.toSorted(byAir),
    count: rows.length,
    countLabel: countLabel(rows.length, 'Episode'),
    years: yearRange(episodes.map(({ first_aired }) => first_aired)),
    seasonLinks: [
      ...numbers.toReversed().map((number) => ({
        text: number === 0 ? 'Specials' : `${number}`,
        href: seasonHref(number),
      })),
      { text: 'All', href: `${href}/seasons/all`, selected: true },
    ],
    previous: last === undefined ? undefined : { href: seasonHref(last), label: `Previous: ${seasonName(last)}` },
    next: first === undefined ? undefined : { href: seasonHref(first), label: `Next: ${seasonName(first)}` },
  };
}
