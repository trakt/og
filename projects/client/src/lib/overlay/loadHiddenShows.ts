import { z } from 'zod/v4';
import type { ApiGet } from './sliceSources.ts';

const rowsSchema = z.array(z.object({
  type: z.literal('show'),
  hidden_at: z.string().nullish(),
  show: z.object({ ids: z.object({ trakt: z.number() }) }),
}));

/** API hidden rows carry the date used by the rewatch and dropped badges. */
export async function loadHiddenShows(get: ApiGet, section: 'dropped' | 'progress_watched_reset') {
  const load = async (page: number) => {
    const response = await get(`/users/hidden/${section}?type=show&limit=250&page=${page}`);
    if (!response.ok) throw new Error(`Hidden shows returned ${response.status}`);
    return {
      rows: rowsSchema.parse(await response.json()),
      pages: Number(response.headers.get('X-Pagination-Page-Count') ?? 1),
    };
  };
  const first = await load(1);
  const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, index) => load(index + 2)));
  return new Map(
    [first, ...rest].flatMap(({ rows }) => rows.map((row) => [row.show.ids.trakt, row.hidden_at ?? ''] as const)),
  );
}
