import type { CachedShow } from '../../shows/cache/CachedShow.ts';

type PlanShowReadsParams = {
  ids: readonly number[];
  /** The tab's shows you've watched: one bulk read covers them. */
  watched: ReadonlySet<number>;
  /** The tab's unstarted watchlist shows: another bulk read covers them. */
  watchlistOnly: ReadonlySet<number>;
  cached: ReadonlyMap<number, CachedShow>;
  now: number;
  ttl: number;
  /** Past this many stale shows in a group, its bulk read is cheaper than one read a show. */
  bulkAt?: number;
};

export type ShowReads = {
  readonly watched: boolean;
  readonly watchlist: boolean;
  /** Shows read one at a time. */
  readonly single: readonly number[];
};

/**
 * Which reads refresh the tab's show summaries: the metadata only has to be fresh, so a cached record without a
 * poster still counts. A group with many stale shows takes its bulk read (250 shows a request); the rest, and every
 * show outside both groups (library-only shows), go one at a time.
 */
export function planShowReads(
  { ids, watched, watchlistOnly, cached, now, ttl, bulkAt = 20 }: PlanShowReadsParams,
): ShowReads {
  const stale = ids.filter((id) => {
    const show = cached.get(id);
    return !show || now - show.fetchedAt >= ttl;
  });
  const staleWatched = stale.filter((id) => watched.has(id));
  const staleWatchlist = stale.filter((id) => watchlistOnly.has(id));
  const bulkWatched = staleWatched.length > bulkAt;
  const bulkWatchlist = staleWatchlist.length > bulkAt;

  return {
    watched: bulkWatched,
    watchlist: bulkWatchlist,
    single: stale.filter((id) => !(bulkWatched && watched.has(id)) && !(bulkWatchlist && watchlistOnly.has(id))),
  };
}
