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
import type { ProgressItem } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';
import { type SeasonPicker, toSeasonPicker } from './toSeasonPicker.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];

/** The up-next banner on an open row: the next episode, with what to do about it. */
export type ProgressUpNext = {
  /** "3x01", or "3x01 (669)" for anime. */
  readonly number: string;
  readonly title: string;
  readonly href: string;
  readonly overview?: string;
  readonly image?: string;
  readonly tags: readonly Tag[];
  /** "52m". */
  readonly runtime?: string;
  /** The Trakt rating, 0 to 10. */
  readonly rating?: number;
  readonly target: { readonly type: 'episode'; readonly id: number; readonly title: string };
  readonly season: { readonly show: number; readonly number: number; readonly episode: number };
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
  /** Once the catalog is in: the season picker, and the next episode unless everything's done (Watched only). */
  readonly picker?: SeasonPicker;
  readonly upNext?: ProgressUpNext;
};

type ToProgressRowParams = {
  item: ProgressItem;
  type: ProgressType;
  datePreferences: DatePreferences;
  now: Date;
};

const UNKNOWN_DATE = Date.parse('1970-01-01T00:00:00Z');
const isUnknown = (date: string) => Date.parse(date) === UNKNOWN_DATE;
const runtime = (minutes: number, exact: boolean) => `${exact ? '' : '~'}${formatRuntime(minutes)}`;

/** Without seasons, the watched share from the left, which is how the ticks look when episodes go in order. */
const countRuns = (completed: number, aired: number) =>
  tickRuns([
    ...Array.from({ length: Math.min(completed, aired) }, () => true),
    ...Array.from({ length: Math.max(aired - completed, 0) }, () => false),
  ]);

/** The API's episode fields that `episodeType` and `episodeNumber` read. */
const tagged = (episode: CatalogEpisode) => ({
  season: episode.season,
  number: episode.number,
  episode_type: episode.type,
  number_abs: episode.numberAbs,
});

function toUpNext({ item, datePreferences }: ToProgressRowParams): ProgressUpNext | undefined {
  const { show, detail } = item;
  const episode = detail?.next;
  if (!episode) return undefined;

  const label = episodeType(tagged(episode));
  const number = episodeNumber(tagged(episode), show.genres);
  const runtime = episode.runtime ?? show.runtime;
  return {
    number,
    title: episode.title ?? '',
    href: `/shows/${show.slug}/seasons/${episode.season}/episodes/${episode.number}`,
    overview: episode.overview,
    image: imageUrl(episode.screenshot ?? show.fanart, 'medium'),
    tags: [
      ...(label ? [label] : []),
      ...(episode.firstAired
        ? [{ text: formatDate(episode.firstAired, datePreferences), kind: 'primary' as const }]
        : []),
    ],
    runtime: runtime ? formatRuntime(runtime) : undefined,
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
    picker: detail &&
      toSeasonPicker({
        seasons,
        next: detail.next && { season: detail.next.season, number: detail.next.number },
        showHref: href,
        type,
        datePreferences,
      }),
    upNext: type === 'library' ? undefined : toUpNext(params),
  };
}
