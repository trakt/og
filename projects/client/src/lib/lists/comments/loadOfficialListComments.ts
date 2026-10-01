import { error, redirect } from '@sveltejs/kit';
import { api } from '../../api/api.ts';
import { fetchListSummary } from '../fetchListSummary.ts';
import { readListComments } from './readListComments.ts';
import { toListCommentsQuery } from './toListCommentsQuery.ts';
import { toListCommentsTarget } from './toListCommentsTarget.ts';

type Params = {
  fetch: typeof globalThis.fetch;
  params: { slug: string };
  url: URL;
};

/**
 * `/lists/official/:slug/comments`. Official lists are public, so every
 * read goes without the token. `/lists/:id/comments` takes only the Trakt id, so the summary reads first.
 */
export async function loadOfficialListComments({ fetch, params, url }: Params) {
  const query = toListCommentsQuery(url.searchParams);
  const client = api({ fetch });
  const found = await fetchListSummary(() =>
    client.lists.summary({ params: { id: params.slug }, query: { extended: 'images' } })
  );
  if (!found || [204, 401, 403, 404].includes(found.status)) error(404, 'Page Not Found');
  if (found.status !== 200) error(502, 'Trakt is having trouble loading this list.');
  // OG finds only official lists here (`OfficialList.friendly.find`).
  if (found.body.type !== 'official') error(404, 'Page Not Found');

  const list = toListCommentsTarget(found.body);
  if (params.slug !== found.body.ids.slug) redirect(301, `${list.href}/comments${url.search}`);

  // A list that went private since the summary read answers a 403.
  const response = await api({ fetch }).lists.comments({
    params: { id: String(found.body.ids.trakt), sort: query.sort },
    query: { page: query.page, limit: query.limit },
  });
  return { sort: query.sort, list, ...readListComments({ response, query }) };
}
