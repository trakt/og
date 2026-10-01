import { error, redirect } from '@sveltejs/kit';
import { readListFilters } from './readListFilters.ts';
import { loadListFilterSources } from './loadListFilterSources.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { fetchListSummary } from './fetchListSummary.ts';
import { fetchListItems, loadListItems, urlListSort } from './loadListItems.ts';
import { listCoverOf } from './listCoverOf.ts';
import { toListQuery } from './toListQuery.ts';
import { toListView } from './toListView.ts';

type Params = {
  cookies?: { get: (name: string) => string | undefined };
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  params: { slug: string };
  url: URL;
  parent: () => Promise<
    { user: HeaderUser | null; datePreferences: DatePreferences; settings?: ViewerSettings | null }
  >;
};

function fetchSummary(fetch: typeof globalThis.fetch, id: string) {
  return fetchListSummary(() => api({ fetch }).lists.summary({ params: { id } }));
}

/** official lists use the public list endpoints and a random, unfiltered item's fanart, without a profile. */
export async function loadOfficialList({ fetch, locals, params, url, parent, cookies }: Params) {
  const fadeHide = readListFilters({
    search: url.searchParams,
    cookies,
    scope: 'list',
    kind: 'official',
    types: toListQuery(url.searchParams).types,
  });
  const query = { ...toListQuery(url.searchParams), hide: fadeHide.hide };
  const summary = await fetchSummary(fetch, params.slug);
  if (!summary || [204, 401, 403, 404].includes(summary.status)) error(404, 'Page Not Found');
  if (summary.status !== 200) error(502, 'Trakt is having trouble loading this list.');
  if (summary.body.type !== 'official') error(404, 'Page Not Found');
  const list = toListView(summary.body);
  if (params.slug !== list.slug) redirect(301, `${list.href}${url.search}`);

  // The items endpoints take only the Trakt id: a slug answers 400.
  const base = `/lists/${list.id}/items`;
  const urlSort = urlListSort(query);
  const [anonymousItems, cover, { user, datePreferences, settings }] = await Promise.all([
    fetchListItems({ fetch, token: null, base, query, sort: urlSort }),
    fetchListItems({
      fetch,
      token: null,
      base,
      query: { ...query, types: [], genres: [], hide: [], terms: undefined, watchnow: undefined, page: 1, limit: 1 },
      sort: { by: 'random', how: 'asc' },
    }).catch(() => null),
    parent(),
  ]);

  const [items, filterSources] = await Promise.all([
    loadListItems({
      fetch,
      token: user ? locals.token : null,
      base,
      query,
      first: anonymousItems,
      fallback: list.sort,
      viewerIsVip: user?.isVip ?? false,
      needsToken: false,
      ownerIsVip: false,
      // Official lists have no Watched/Collected percentages or library ids in their stats.
      viewerSignedIn: false,
      datePreferences,
    }),
    loadListFilterSources({ fetch, watchnow: query.watchnow, settings }),
  ]);
  return {
    kind: 'official' as const,
    list,
    query,
    fadeHide,
    filterSources,
    ...items,
    datePreferences,
    collaborators: [] as readonly string[],
    isCollaborator: false,
    listCover: listCoverOf(cover?.rows.at(0)),
  };
}
