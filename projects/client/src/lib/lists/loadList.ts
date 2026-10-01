import { error, redirect } from '@sveltejs/kit';
import { readListFilters } from './readListFilters.ts';
import { loadListFilterSources } from './loadListFilterSources.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { fetchCollaborators } from '../users/lists/fetchCollaborators.ts';
import { fetchListSummary } from './fetchListSummary.ts';
import type { ProfileUser } from '../users/ProfileUser.ts';
import { fetchListItems, loadListItems, urlListSort } from './loadListItems.ts';
import { toListQuery } from './toListQuery.ts';
import { toListView } from './toListView.ts';

type Params = {
  cookies?: { get: (name: string) => string | undefined };
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  params: { id: string; list: string };
  url: URL;
  parent: () => Promise<{
    profile: ProfileUser;
    isSelf: boolean;
    user: HeaderUser | null;
    settings?: ViewerSettings | null;
    datePreferences: DatePreferences;
  }>;
};

function fetchSummary(client: ReturnType<typeof api>, { id, list }: { id: string; list: string }) {
  return fetchListSummary(() => client.users.lists.list.summary({ params: { id, list_id: list } }));
}

/**
 * `/users/:id/lists/:list_id`: the list, then a page of its items in the
 * chosen sort. Public lists read without the token alongside the frame's load, so the worker's cache answers; a list
 * only the viewer can see, or a sort about the viewer, reads again with it.
 */
export async function loadList({ fetch, locals, params, url, parent, cookies }: Params) {
  const initialFilters = readListFilters({ search: url.searchParams, cookies, scope: 'list' });
  const initialQuery = { ...toListQuery(url.searchParams), hide: initialFilters.hide };
  const base = `/users/${encodeURIComponent(params.id)}/lists/${encodeURIComponent(params.list)}/items`;
  const token = locals.token;

  const [anonymousSummary, anonymousItems, { profile, isSelf, user, datePreferences, settings }] = await Promise.all([
    fetchSummary(api({ fetch }), { id: params.id, list: params.list }),
    fetchListItems({ fetch, token: null, base, query: initialQuery, sort: urlListSort(initialQuery) }),
    parent(),
  ]);
  const fadeHide = readListFilters({
    search: url.searchParams,
    cookies,
    scope: 'list',
    kind: 'personal',
    types: initialQuery.types,
    isSelf: user?.slug === profile.slug,
  });
  const query = { ...initialQuery, hide: fadeHide.hide };
  const unchanged = query.hide.join(',') === initialQuery.hide.join(',');
  const shell = { kind: 'personal' as const, query, fadeHide, datePreferences };
  if (profile.isLocked) return { ...shell, list: null };

  // A stale token keeps the anonymous answer: the server never refreshes, the browser does.
  const viewerSummary = anonymousSummary?.status !== 200 && token
    ? await fetchSummary(api({ fetch, token }), { id: params.id, list: params.list })
    : null;
  const summary = viewerSummary?.status === 200 ? viewerSummary : anonymousSummary;
  if (!summary || [204, 403, 404].includes(summary.status)) error(404, 'Page Not Found');
  if (summary.status !== 200) error(502, 'Trakt is having trouble loading this list.');

  const list = toListView(summary.body);
  // OG took an id or an old slug too; og keeps one URL per list.
  if (params.list !== list.slug) redirect(301, `${list.href}${url.search}`);

  const [items, collaborators, filterSources] = await Promise.all([
    loadListItems({
      fetch,
      token,
      base,
      query,
      first: unchanged ? anonymousItems : { ...anonymousItems, status: 0 },
      fallback: list.sort,
      viewerIsVip: user?.isVip ?? false,
      needsToken: viewerSummary?.status === 200,
      ownerIsVip: Boolean(profile.vip),
      viewerSignedIn: user !== null,
      datePreferences,
    }),
    fetchCollaborators({ fetch, listId: list.id, token: list.isPublic ? null : token }),
    loadListFilterSources({ fetch, watchnow: query.watchnow, settings }),
  ]);

  return {
    ...shell,
    list,
    ...items,
    filterSources,
    collaborators: collaborators.map(({ name }) => name),
    viewerCollaboratorName: collaborators.find(({ slug }) => slug === user?.slug)?.name,
    isCollaborator: !isSelf && collaborators.some(({ slug }) => slug === user?.slug),
  };
}
