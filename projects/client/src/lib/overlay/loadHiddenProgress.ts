import { z } from 'zod/v4';
import type { HiddenProgress } from './HiddenProgress.ts';
import type { ApiGet } from './sliceSources.ts';

const rowsSchema = z.array(z.object({
  type: z.string(),
  show: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
  season: z.object({ number: z.number() }).nullish(),
}));

/** Every show and season hidden from one progress tab, read page by page from `/users/hidden/:section`. */
export async function loadHiddenProgress(
  get: ApiGet,
  section: 'progress_watched' | 'progress_collected',
): Promise<HiddenProgress> {
  const load = async (page: number) => {
    const response = await get(`/users/hidden/${section}?limit=250&page=${page}`);
    if (!response.ok) throw new Error(`Hidden progress returned ${response.status}`);
    return {
      rows: rowsSchema.parse(await response.json()),
      pages: Number(response.headers.get('X-Pagination-Page-Count') ?? 1),
    };
  };
  const first = await load(1);
  const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, index) => load(index + 2)));
  const rows = [first, ...rest].flatMap(({ rows }) => rows);

  const shows = new Set(rows.flatMap((row) => row.type === 'show' && row.show ? [row.show.ids.trakt] : []));
  const seasons = rows.reduce((all, row) => {
    if (row.type !== 'season' || !row.show || !row.season) return all;
    const id = row.show.ids.trakt;
    return new Map(all).set(id, new Set([...(all.get(id) ?? []), row.season.number]));
  }, new Map<number, ReadonlySet<number>>());
  return { shows, seasons };
}
