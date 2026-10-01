import { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { UserListRow } from './UserListRow.ts';

/** Built-in rows have no summary; their comments route supplies the numeric list id on demand. */
export async function resolveRowListId({ fetch, row }: {
  fetch: typeof globalThis.fetch;
  row: Pick<UserListRow, 'id' | 'owner' | 'kind'>;
}): Promise<number> {
  if (row.id !== null) return row.id;
  if (row.kind !== 'watchlist' && row.kind !== 'favorites') throw new Error('Missing list id');
  const response = await rawApiFetch({
    fetch,
    path: `/users/${encodeURIComponent(row.owner.slug)}/${row.kind}/comments/newest?limit=1`,
  });
  if (!response.ok) throw new Error('List unavailable');
  z.array(z.unknown()).parse(await response.json());
  return z.coerce.number().int().positive().parse(response.headers.get('X-List-ID'));
}
