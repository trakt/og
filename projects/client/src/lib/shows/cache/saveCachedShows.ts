import type { CachedShow } from './CachedShow.ts';
import { mergeCachedShow } from './mergeCachedShow.ts';
import type { ShowStore } from './showStore.ts';

/** Merges newer reads into the store (`mergeCachedShow`) and resolves the merged records by id. */
export async function saveCachedShows(
  { store, shows }: { store: ShowStore<CachedShow>; shows: readonly CachedShow[] },
): Promise<ReadonlyMap<number, CachedShow>> {
  const cached = await store.get(shows.map(({ id }) => id));
  const merged = shows.map((show) => mergeCachedShow(cached.get(show.id), show));
  await store.put(merged);
  return new Map(merged.map((show) => [show.id, show]));
}
