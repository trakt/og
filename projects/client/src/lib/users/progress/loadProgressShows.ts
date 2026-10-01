import { z } from 'zod/v4';
import type { ApiGet } from '../../overlay/sliceSources.ts';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import { cachedShowSchema } from '../../shows/cache/cachedShowSchema.ts';
import { loadCachedShows } from '../../shows/cache/loadCachedShows.ts';
import { saveCachedShows } from '../../shows/cache/saveCachedShows.ts';
import type { ShowStore } from '../../shows/cache/showStore.ts';
import { toCachedShow } from '../../shows/cache/toCachedShow.ts';
import { planShowReads } from './planShowReads.ts';

type LoadProgressShowsParams = {
  /** The viewer's slug. */
  slug: string;
  ids: readonly number[];
  watched: ReadonlySet<number>;
  watchlistOnly: ReadonlySet<number>;
  store: ShowStore<CachedShow>;
  /** The viewer's own reads, with the token, through the request queue. */
  get: ApiGet;
  /** Public show reads through the request queue. */
  publicGet: ApiGet;
  now?: () => number;
  ttl?: number;
};

const TWELVE_HOURS = 12 * 60 * 60_000;
const PAGE = 250;
const rowsSchema = z.array(z.object({ show: cachedShowSchema }));

/** Every page of a bulk show read, parsed. A failed page throws. */
async function readPages(get: ApiGet, path: string, now: number): Promise<readonly CachedShow[]> {
  const read = async (page: number) => {
    const response = await get(`${path}&limit=${PAGE}&page=${page}`);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return {
      shows: rowsSchema.parse(await response.json()).map(({ show }) => toCachedShow(show, now)),
      pages: Number(response.headers.get('X-Pagination-Page-Count') ?? 1),
    };
  };
  const first = await read(1);
  const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, i) => read(i + 2)));
  return [first, ...rest].flatMap(({ shows }) => shows);
}

/**
 * The tab's show summaries, read only where the cache is missing or stale (`planShowReads`): your watched shows and
 * your watchlist in bulk, anything else one show at a time. A bulk read that fails falls back to single reads, and
 * a show that still can't load is left out until the next visit.
 */
export async function loadProgressShows(
  { slug, ids, watched, watchlistOnly, store, get, publicGet, now = Date.now, ttl = TWELVE_HOURS }:
    LoadProgressShowsParams,
): Promise<ReadonlyMap<number, CachedShow>> {
  const cached = await store.get(ids);
  const plan = planShowReads({ ids, watched, watchlistOnly, cached, now: now(), ttl });
  const user = encodeURIComponent(slug);
  const bulk = await Promise.all([
    plan.watched ? readPages(get, `/users/${user}/watched/shows?extended=full`, now()).catch(() => null) : [],
    plan.watchlist
      ? readPages(get, `/users/${user}/watchlist/shows?extended=full,images`, now()).catch(() => null)
      : [],
  ]);
  const read = await saveCachedShows({ store, shows: bulk.flatMap((shows) => shows ?? []) });

  const stale = (id: number) => {
    const show = cached.get(id);
    return !show || now() - show.fetchedAt >= ttl;
  };
  const failed = (group: ReadonlySet<number>, result: readonly CachedShow[] | null) =>
    result === null ? ids.filter((id) => group.has(id) && stale(id)) : [];
  const single = [...new Set([...plan.single, ...failed(watched, bulk[0]), ...failed(watchlistOnly, bulk[1])])]
    .filter((id) => !read.has(id));
  if (single.length > 0) await loadCachedShows({ ids: single, store, get: publicGet, now, ttl });

  return store.get(ids);
}
