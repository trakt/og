import type { CollectedItem } from '../../overlay/CollectedItem.ts';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { CatalogEpisode, ShowCatalog } from '../../shows/cache/ShowCatalog.ts';
import { nextEpisode } from './nextEpisode.ts';
import type { ProgressEpisodeData, ProgressItem, ProgressSeasonData } from './ProgressItem.ts';

/** Season number to an episode key (its id when watched, its number when collected) to the value. */
type Seasons<T> = ReadonlyMap<number, ReadonlyMap<number, T>>;

type ToProgressItemParams = {
  /** Which state counts as done: watches (Watched, Dropped) or the library. */
  kind: 'watched' | 'library';
  show: CachedShow;
  /** The show's watches from the overlay, by episode id. */
  watched?: Seasons<readonly string[]>;
  /** The show's library from the overlay, by episode number. */
  collected?: Seasons<CollectedItem>;
  /** A rewatch: only watches since then count toward done. */
  resetAt?: string;
  droppedAt?: string;
  /** Season numbers hidden from this tab. */
  hiddenSeasons?: ReadonlySet<number>;
  catalog?: ShowCatalog;
  includeSpecials: boolean;
  useLastActivity: boolean;
  now: number;
};

const latest = (dates: readonly string[]) =>
  dates.reduce<string | undefined>((max, date) => (max === undefined || date > max ? date : max), undefined);
const collectedAt = (item: CollectedItem | undefined) => typeof item === 'string' ? item : item?.at;
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/** Without a catalog: the summary's aired count against the overlay's episodes, specials left out like the count. */
function fromSummary(params: ToProgressItemParams): ProgressItem {
  const { kind, show, watched, collected, resetAt, droppedAt } = params;
  const aired = show.airedEpisodes ?? 0;
  const runtime = show.runtime ?? 0;
  const regular = <T>(seasons: Seasons<T> | undefined) =>
    [...(seasons ?? new Map<number, ReadonlyMap<number, T>>())]
      .filter(([number]) => number > 0)
      .flatMap(([, episodes]) => [...episodes.values()]);

  const watches = kind === 'watched' ? regular(watched) : [];
  const plays = sum(watches.map((dates) => dates.length));
  const done = kind === 'watched'
    ? watches.filter((dates) => dates.some((date) => !resetAt || date >= resetAt)).length
    : regular(collected).length;
  const completed = Math.min(done, aired);
  const lastAt = kind === 'watched'
    ? latest([...(watched?.values() ?? [])].flatMap((episodes) => [...episodes.values()].flat()))
    : latest(
      [...(collected?.values() ?? [])].flatMap((episodes) =>
        [...episodes.values()].flatMap((item) => collectedAt(item) ?? [])
      ),
    );

  return {
    show,
    aired,
    completed,
    plays,
    minutesWatched: plays * runtime,
    minutesLeft: (aired - completed) * runtime,
    exact: false,
    lastAt,
    resetAt,
    droppedAt,
  };
}

type Episode = ProgressEpisodeData & { readonly episode: CatalogEpisode; readonly runtime: number };

/** With a catalog: every aired, unhidden episode, so the counts, times, seasons and next episode are exact. */
function fromCatalog(params: ToProgressItemParams, catalog: ShowCatalog): ProgressItem {
  const { kind, show, watched, collected, resetAt, droppedAt, hiddenSeasons, includeSpecials, useLastActivity, now } =
    params;
  const aired = (episode: CatalogEpisode) => episode.firstAired !== undefined && Date.parse(episode.firstAired) <= now;

  const seasons = catalog.seasons
    .filter(({ number }) => (number > 0 || includeSpecials) && !hiddenSeasons?.has(number))
    .map((season) => ({
      season,
      episodes: season.episodes.filter(aired).map((episode): Episode => {
        const dates = kind === 'watched' ? watched?.get(season.number)?.get(episode.id) ?? [] : [];
        const added = collectedAt(collected?.get(season.number)?.get(episode.number));
        const runtime = episode.runtime ?? show.runtime ?? 0;
        return {
          episode,
          runtime,
          number: episode.number,
          done: kind === 'watched' ? dates.some((date) => !resetAt || date >= resetAt) : added !== undefined,
          plays: dates.length,
          minutesWatched: dates.length * runtime,
          at: kind === 'watched' ? latest(dates) : added,
        };
      }),
    }))
    .filter(({ episodes }) => episodes.length > 0);

  const toSeason = ({ season, episodes }: (typeof seasons)[number]): ProgressSeasonData => ({
    number: season.number,
    title: season.title,
    aired: episodes.length,
    completed: episodes.filter(({ done }) => done).length,
    plays: sum(episodes.map(({ plays }) => plays)),
    minutesWatched: sum(episodes.map(({ minutesWatched }) => minutesWatched)),
    minutesLeft: sum(episodes.filter(({ done }) => !done).map(({ runtime }) => runtime)),
    episodes: episodes.map(({ number, done, plays, minutesWatched, at }) => ({
      number,
      done,
      plays,
      minutesWatched,
      at,
    })),
  });

  const all = seasons.flatMap(({ episodes }) => episodes);
  const last = all.reduce<Episode | undefined>(
    (found, episode) => episode.at && (!found?.at || episode.at > found.at) ? episode : found,
    undefined,
  );
  const rows = seasons.map(toSeason);
  const doneIds = new Set(all.flatMap(({ episode, done }) => done ? [episode.id] : []));

  return {
    show,
    aired: all.length,
    completed: sum(rows.map(({ completed }) => completed)),
    plays: sum(rows.map(({ plays }) => plays)),
    minutesWatched: sum(rows.map(({ minutesWatched }) => minutesWatched)),
    minutesLeft: sum(rows.map(({ minutesLeft }) => minutesLeft)),
    exact: true,
    lastAt: last?.at,
    resetAt,
    droppedAt,
    detail: {
      seasons: rows,
      next: nextEpisode({
        episodes: all.map(({ episode }) => episode),
        done: ({ id }) => doneIds.has(id),
        latest: last?.episode.id,
        useLastActivity,
      }),
      last: last?.episode,
    },
  };
}

/** One show's progress row data, exact once its catalog is loaded (see `ProgressItem`). */
export function toProgressItem(params: ToProgressItemParams): ProgressItem {
  return params.catalog ? fromCatalog(params, params.catalog) : fromSummary(params);
}
