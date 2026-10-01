import { rawApiFetch } from '../api/rawApiFetch.ts';
import { listCoverOf } from './listCoverOf.ts';
import { listItemRowsSchema } from './listItemRowsSchema.ts';

type FetchListFanartParams = {
  fetch?: typeof globalThis.fetch;
  /** The list's trakt id. */
  id: number;
};

// OG walked every item; the first ten is plenty to find one with fanart.
const LIMIT = 10;

/**
 * A list's fanart: the API gives lists no fanart of their own, so it's the
 * first item in the list's own order that has one, a season or episode using its show's. `undefined` when none does
 * or the read fails. Public lists only, so it goes without the viewer's token.
 */
export async function fetchListFanart({ fetch, id }: FetchListFanartParams): Promise<string | undefined> {
  const query = new URLSearchParams({ limit: String(LIMIT), extended: 'full,images' });
  const response = await rawApiFetch({ fetch, path: `/lists/${id}/items?${query}` }).catch(() => null);
  if (response?.status !== 200) return undefined;

  const rows = listItemRowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) return undefined;
  return rows.data.map(listCoverOf).find((cover) => cover !== undefined);
}
