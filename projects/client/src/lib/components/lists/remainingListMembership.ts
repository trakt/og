import { z } from 'zod/v4';
import type { OverlaySlices } from '../../overlay/OverlaySlices.ts';
import { pickerCatalogSchema } from './pickerCatalogSchema.ts';
const itemSchema = z.array(z.object({
  type: z.enum(['movie', 'show', 'season', 'episode', 'person']),
  movie: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
  show: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
  season: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
  episode: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
  person: z.object({ ids: z.object({ trakt: z.number() }) }).nullish(),
}));
/** Deleting one list must keep posters listed on another own or collaborative list. */
export async function remainingListMembership(
  { get, exclude }: { get: (path: string) => Promise<Response>; exclude: number },
): Promise<OverlaySlices['listed']> {
  const catalog = await get('/v3/users/me/lists');
  if (!catalog.ok) throw new Error('Lists unavailable');
  const lists = pickerCatalogSchema.parse(await catalog.json()).filter((list) => list.id !== exclude);
  const read = async (id: number, page = 1): Promise<z.infer<typeof itemSchema>> => {
    const response = await get(`/lists/${id}/items?limit=250&page=${page}`);
    if (!response.ok) throw new Error('Membership unavailable');
    const rows = itemSchema.parse(await response.json());
    const pages = Number(response.headers.get('x-pagination-page-count')) || 1;
    return page < pages ? [...rows, ...await read(id, page + 1)] : rows;
  };
  const rows = (await Promise.all(lists.map((list) => read(list.id)))).flat();
  const ids = (type: z.infer<typeof itemSchema>[number]['type']) =>
    new Set(
      rows.filter((row) => row.type === type).flatMap((row) => {
        const id = row[type]?.ids.trakt;
        return id === undefined ? [] : [id];
      }),
    );
  return {
    movie: ids('movie'),
    show: ids('show'),
    season: ids('season'),
    episode: ids('episode'),
    person: ids('person'),
  };
}
