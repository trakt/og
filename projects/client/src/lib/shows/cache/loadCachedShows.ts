import type { ApiGet } from '../../overlay/sliceSources.ts';
import type { CachedShow } from './CachedShow.ts';
import { cachedShowSchema } from './cachedShowSchema.ts';
import { saveCachedShows } from './saveCachedShows.ts';
import type { ShowStore } from './showStore.ts';
import { toCachedShow } from './toCachedShow.ts';

type LoadCachedShowsParams = {
  ids: readonly number[];
  store: ShowStore<CachedShow>;
  /** `/shows/:id?extended=full,images`, through the request queue. */
  get: ApiGet;
  now?: () => number;
  /** How long a summary stays fresh. Aired counts move as episodes air. */
  ttl?: number;
};

const TWELVE_HOURS = 12 * 60 * 60_000;

async function fetchShow(get: ApiGet, id: number, now: number): Promise<CachedShow | null> {
  const response = await get(`/shows/${id}?extended=full,images`).catch(() => null);
  if (!response?.ok) return null;
  const parsed = cachedShowSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? toCachedShow(parsed.data, now) : null;
}

/**
 * Summaries for these shows: cached ones while fresh and complete, the rest read one show at a time and saved. A
 * show that fails to load keeps its stale record, or is left out.
 */
export async function loadCachedShows(
  { ids, store, get, now = Date.now, ttl = TWELVE_HOURS }: LoadCachedShowsParams,
): Promise<ReadonlyMap<number, CachedShow>> {
  const cached = await store.get(ids);
  const stale = ids.filter((id) => {
    const show = cached.get(id);
    return !show || !show.complete || now() - show.fetchedAt >= ttl;
  });
  if (stale.length === 0) return cached;

  const fetched = (await Promise.all(stale.map((id) => fetchShow(get, id, now())))).filter((show) => show !== null);
  const saved = await saveCachedShows({ store, shows: fetched });
  return new Map(ids.flatMap((id) => {
    const show = saved.get(id) ?? cached.get(id);
    return show ? [[id, show] as const] : [];
  }));
}
