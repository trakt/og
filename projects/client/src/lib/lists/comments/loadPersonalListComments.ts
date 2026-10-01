import { error, redirect } from '@sveltejs/kit';
import { api } from '../../api/api.ts';
import type { ProfileUser } from '../../users/ProfileUser.ts';
import { fetchListSummary } from '../fetchListSummary.ts';
import type { ListCommentsTarget } from './ListCommentsTarget.ts';
import { emptyListComments, readListComments } from './readListComments.ts';
import { toListCommentsQuery } from './toListCommentsQuery.ts';
import { toListCommentsTarget } from './toListCommentsTarget.ts';

const lockedTarget = (profile: ProfileUser, slug: string): ListCommentsTarget => ({
  title: '',
  fullTitle: '',
  href: `/users/${profile.slug}/lists/${slug}`,
  id: null,
  allowComments: false,
  posters: [],
});

type Params = {
  fetch: typeof globalThis.fetch;
  parent: () => Promise<{ profile: ProfileUser }>;
  locals: { token: string | null };
  params: { id: string; list: string };
  url: URL;
};

/**
 * `/users/:id/lists/:list/comments`: the list, then a page of its
 * comments. Both read without the token alongside the frame's load; a list only the viewer can see reads again with it.
 */
export async function loadPersonalListComments({ fetch, parent, locals, params, url }: Params) {
  const query = toListCommentsQuery(url.searchParams);
  const ids = { id: params.id, list_id: params.list };
  const summary = (token: string | null) =>
    fetchListSummary(() =>
      api({ fetch, token }).users.lists.list.summary({ params: ids, query: { extended: 'images' } })
    );
  // A missing or private list's comments answer a 403.
  const comments = (token: string | null) =>
    api({ fetch, token }).users.lists.list.comments({
      params: { ...ids, sort: query.sort },
      query: { page: query.page, limit: query.limit },
    });

  const [anonymousSummary, anonymousComments, { profile }] = await Promise.all([
    summary(null),
    comments(null),
    parent(),
  ]);
  // The profile frame shows the locked notice instead of the page.
  if (profile.isLocked) {
    return { sort: query.sort, list: lockedTarget(profile, params.list), ...emptyListComments(query) };
  }

  // A stale token keeps the anonymous answer: the server never refreshes, the browser does.
  const [viewerSummary, viewerComments] = anonymousSummary?.status !== 200 && locals.token
    ? await Promise.all([summary(locals.token), comments(locals.token)])
    : [null, null];
  const found = viewerSummary?.status === 200 ? viewerSummary : anonymousSummary;
  if (!found || [204, 401, 403, 404].includes(found.status)) error(404, 'Page Not Found');
  if (found.status !== 200) error(502, 'Trakt is having trouble loading this list.');

  const list = toListCommentsTarget(found.body);
  // OG took an id or an old slug too; og keeps one URL per list.
  if (params.list !== found.body.ids.slug) redirect(301, `${list.href}/comments${url.search}`);

  const response = viewerSummary?.status === 200 && viewerComments ? viewerComments : anonymousComments;
  return { sort: query.sort, list, ...readListComments({ response, query }) };
}
