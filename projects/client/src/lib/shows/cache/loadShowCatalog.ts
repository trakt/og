import type { ApiGet } from '../../overlay/sliceSources.ts';
import type { ShowCatalog } from './ShowCatalog.ts';
import type { ShowStore } from './showStore.ts';
import { toShowCatalog } from './toShowCatalog.ts';

type LoadShowCatalogParams = {
  id: number;
  store: ShowStore<ShowCatalog>;
  /** `/shows/:id/seasons?extended=full,episodes`, through the request queue. */
  get: ApiGet;
  now?: () => number;
  ttl?: number;
};

const TWELVE_HOURS = 12 * 60 * 60_000;

/**
 * A show's catalog: the cached one while fresh, otherwise one read, saved. A failed read falls back to a stale
 * catalog, and rejects without one.
 */
export async function loadShowCatalog(
  { id, store, get, now = Date.now, ttl = TWELVE_HOURS }: LoadShowCatalogParams,
): Promise<ShowCatalog> {
  const cached = (await store.get([id])).get(id);
  if (cached && now() - cached.fetchedAt < ttl) return cached;

  try {
    const response = await get(`/shows/${id}/seasons?extended=full,episodes`);
    if (!response.ok) throw new Error(`show catalog: ${response.status}`);
    const catalog = toShowCatalog({ id, body: await response.json(), fetchedAt: now() });
    await store.put([catalog]);
    return catalog;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}
