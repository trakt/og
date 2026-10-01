import { readListFilters } from './readListFilters.ts';
import { loadListFilterSources } from './loadListFilterSources.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ProfileUser } from '../users/ProfileUser.ts';
import { fetchListItems, loadListItems, urlListSort, usedListSort } from './loadListItems.ts';
import type { ListSort } from './resolveListSort.ts';
import { type BuiltInListKind, toBuiltInListView } from './toBuiltInListView.ts';
import { toListQuery } from './toListQuery.ts';

type Params = {
  cookies?: { get: (name: string) => string | undefined };
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  params: { id: string };
  url: URL;
  parent: () => Promise<{
    profile: ProfileUser;
    user: HeaderUser | null;
    settings?: ViewerSettings | null;
    datePreferences: DatePreferences;
  }>;
  kind: BuiltInListKind;
};

type ListComments = { id: number | null; count: number };

/** The list's id and comment count, from the headers of one comment. Neither is worth failing the page over. */
async function fetchListComments(
  { fetch, token, id, kind }: {
    fetch: typeof globalThis.fetch;
    token: string | null;
    id: string;
    kind: BuiltInListKind;
  },
): Promise<ListComments> {
  const none = { id: null, count: 0 };
  const response = await api({ fetch, token }).users[kind]
    .comments({ params: { id, sort: 'newest' }, query: { page: 1, limit: 1 } })
    .catch(() => null);
  if (response?.status !== 200) return none;
  const listId = Number(response.headers.get('x-list-id'));
  return {
    id: listId > 0 ? listId : null,
    count: Number(response.headers.get('x-pagination-item-count')) || 0,
  };
}

// The list's default sort, as the worker applied it to a request that didn't name one.
function defaultSort(headers: Headers): ListSort {
  const used = usedListSort(headers);
  return { by: used.by || 'rank', how: used.how === 'desc' ? 'desc' : 'asc' };
}

/**
 * `/users/:id/watchlist` and `/users/:id/favorites`:
 * the same list page as a personal list, over `/users/:id/{watchlist,favorites}/:type/:sort_by/:sort_how`. There's no
 * list object to read, so the page builds one from the items' default sort and the comments' headers.
 * Public profiles read without the token alongside the frame's load; a private one reads again with it.
 */
export async function loadBuiltInList({ fetch, locals, params, url, parent, cookies, kind }: Params) {
  const initialFilters = readListFilters({ search: url.searchParams, cookies, scope: kind });
  const initialQuery = { ...toListQuery(url.searchParams), hide: initialFilters.hide };
  const base = `/users/${encodeURIComponent(params.id)}/${kind}`;
  const token = locals.token;
  const urlSort = urlListSort(initialQuery);

  const [anonymousItems, anonymousComments, { profile, user, datePreferences, settings }] = await Promise.all([
    fetchListItems({ fetch, token: null, base, query: initialQuery, sort: urlSort }),
    fetchListComments({ fetch, token: null, id: params.id, kind }),
    parent(),
  ]);
  const fadeHide = readListFilters({
    search: url.searchParams,
    cookies,
    scope: kind,
    kind: kind,
    types: initialQuery.types,
    isSelf: user?.slug === profile.slug,
  });
  const query = { ...initialQuery, hide: fadeHide.hide };
  const unchanged = query.hide.join(',') === initialQuery.hide.join(',');
  const shell = { kind, query, fadeHide, datePreferences };
  if (profile.isLocked) return { ...shell, list: null };

  // A private profile's lists answer the token only: its owner reads them again, default sort and all.
  const needsToken = profile.isPrivate && Boolean(token);
  const [viewerItems, comments] = needsToken
    ? await Promise.all([
      fetchListItems({ fetch, token, base, query, sort: urlSort }),
      fetchListComments({ fetch, token, id: params.id, kind }),
    ])
    : [null, anonymousComments];
  // A stale token keeps the anonymous answer: the server never refreshes, the browser does.
  const viewerFirst = viewerItems !== null && viewerItems.status !== 401;
  const first = viewerFirst ? viewerItems : unchanged ? anonymousItems : { ...anonymousItems, status: 0 };
  // With a sort in the URL, only its direction can fall back, and the request already sent `asc`.
  const fallback: ListSort = urlSort ? { by: 'rank', how: 'asc' } : defaultSort(first.headers);
  const [items, filterSources] = await Promise.all([
    loadListItems({
      fetch,
      token,
      base,
      query,
      first,
      firstHasToken: viewerFirst,
      fallback,
      viewerIsVip: user?.isVip ?? false,
      needsToken: viewerFirst,
      ownerIsVip: Boolean(profile.vip),
      viewerSignedIn: user !== null,
      datePreferences,
    }),
    loadListFilterSources({ fetch, watchnow: query.watchnow, settings }),
  ]);
  const list = toBuiltInListView({
    kind,
    profile,
    id: comments.id,
    commentCount: comments.count,
    itemCount: items.total,
    sort: fallback,
  });

  return {
    ...shell,
    list,
    ...items,
    filterSources,
    collaborators: [] as readonly string[],
    isCollaborator: false,
  };
}
