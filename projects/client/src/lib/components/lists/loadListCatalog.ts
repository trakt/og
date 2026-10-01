import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { PickerList } from './PickerList.ts';
import { pickerCatalogSchema } from './pickerCatalogSchema.ts';

/** Fresh own and collaborative destinations, including their owners and rank. Shared by both list pickers. */
export async function loadListCatalog(fetch: typeof globalThis.fetch): Promise<PickerList[]> {
  const response = await rawApiFetch({ fetch, path: '/v3/users/me/lists' });
  if (!response.ok) throw new Error('Lists unavailable');
  const rows = pickerCatalogSchema.parse(await response.json());
  const client = api({ fetch });
  return await Promise.all(rows.map(async (row) => {
    const summary = await client.lists.summary({ params: { id: String(row.id) }, query: {} });
    if (summary.status !== 200) throw new Error('List details unavailable');
    return {
      id: row.id,
      name: row.name,
      count: row.count,
      rank: row.display_order,
      collaboration: row.type === 'collaborative',
      privacy: summary.body.privacy,
      owner: summary.body.user.ids.slug ?? String(row.owner_id),
      selected: false,
    };
  }));
}
