import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { fetchListSummary } from './fetchListSummary.ts';
import { listPath } from './listPath.ts';

type RedirectToListParams = {
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  params: { id: string };
};

function readList(fetch: typeof globalThis.fetch, id: string, token: string | null) {
  return fetchListSummary(() => api({ fetch, token }).lists.summary({ params: { id } }));
}

/**
 * `/lists/:id`, `/watchlist/:id` and `/officiallist/:id`: a 301 to the list's own page.
 * A list the viewer can't see is a 404. The public read goes first; the token only for a list it didn't find.
 */
export async function redirectToList({ fetch, locals, params }: RedirectToListParams): Promise<never> {
  const anonymous = await readList(fetch, params.id, null);
  const response = anonymous?.status !== 200 && locals.token
    ? await readList(fetch, params.id, locals.token)
    : anonymous;
  if (response?.status === 200) redirect(301, listPath(response.body));
  if (!response || [204, 401, 403, 404].includes(response.status)) error(404, 'Page Not Found');
  error(502, 'Trakt is having trouble loading this list.');
}
