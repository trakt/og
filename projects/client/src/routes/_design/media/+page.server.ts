import { api } from '../../../lib/api/api.ts';

/** Real trending shows, so the demo cards show real posters and fanart. Public, so it goes without the token. */
export async function load({ fetch }) {
  const response = await api({ fetch }).shows.trending({
    query: { extended: 'full,images', limit: 12 },
  });

  return { trending: response.status === 200 ? response.body : [] };
}
