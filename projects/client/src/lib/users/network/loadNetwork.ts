import { error } from '@sveltejs/kit';
import { api } from '../../api/api.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import type { PageMeta } from '../../api/PageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { loadViewerLists } from '../loadViewerLists.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { toProfileUser } from '../toProfileUser.ts';
import { toViewerRelation } from '../toViewerRelation.ts';
import { networkRowsSchema } from './networkRowsSchema.ts';
import { type NetworkType, networkTypes } from './networkTypes.ts';

type Params = {
  fetch: typeof fetch;
  parent: () => Promise<
    {
      profile: ProfileUser;
      isSelf: boolean;
      user: { readonly slug: string } | null;
      settings?: { permissions?: { following?: boolean } } | null;
    }
  >;
  locals: { token: string | null; viewerLists?: ReturnType<typeof loadViewerLists> };
  params: { id: string; type?: string };
  url: URL;
};

/** OG's page size ( `per(54)`). */
export const NETWORK_PAGE_SIZE = 54;

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

const isNetworkType = (value: string): value is NetworkType => Object.hasOwn(networkTypes, value);

type Fetched = { response: Response; type: NetworkType };

/** Following and Followers page on the API. A stale cookie falls back to the public list, never a refresh. */
async function fetchList({ fetch, token, id, type, page }: {
  fetch: typeof globalThis.fetch;
  token: string | null;
  id: string;
  type: Exclude<NetworkType, 'following_pending'>;
  page: number;
}): Promise<Fetched> {
  const query = new URLSearchParams({ extended: 'full,vip', page: String(page), limit: String(NETWORK_PAGE_SIZE) });
  const path = `/users/${encodeURIComponent(id)}/${type}?${query}`;
  const response = await rawApiFetch({ fetch, token, path });
  if (response.status !== 401 || !token) return { response, type };
  return { response: await rawApiFetch({ fetch, path }), type };
}

/** The viewer's own unapproved follows. API sends the whole list, so og pages it here. */
function fetchPending({ fetch, token }: { fetch: typeof globalThis.fetch; token: string | null }): Promise<Fetched> {
  return rawApiFetch({ fetch, token, path: '/users/requests/following?extended=full,vip' })
    .then((response) => ({ response, type: 'following_pending' as const }));
}

/** The page window of a list that came back whole. */
function slicePage<T>(rows: readonly T[], current: number): { rows: readonly T[]; page: PageMeta } {
  const total = Math.max(1, Math.ceil(rows.length / NETWORK_PAGE_SIZE));
  const page = Math.min(current, total);
  return {
    rows: rows.slice((page - 1) * NETWORK_PAGE_SIZE, page * NETWORK_PAGE_SIZE),
    page: { type: 'paginated', current: page, total },
  };
}

/**
 * `/users/:id/network(/:type)`: Following (the default), your own Following (Pending), or Followers, 54 cards a page.
 * The viewer's follow state with each card streams in after the page.
 */
export async function loadNetwork({ fetch, parent, locals, params, url }: Params) {
  const requested = params.type ?? 'following';
  if (!isNetworkType(requested)) error(404, 'Page Not Found');
  const current = positiveInt(url.searchParams.get('page'), 1);
  const token = locals.token;
  const list = (type: Exclude<NetworkType, 'following_pending'>) =>
    fetchList({ fetch, token, id: params.id, type, page: current });

  const [initial, { profile, isSelf, user: viewer, settings }] = await Promise.all([
    requested === 'following_pending' ? (token ? fetchPending({ fetch, token }) : null) : list(requested),
    parent(),
  ]);

  const empty = {
    canFollow: settings?.permissions?.following !== false,
    type: requested,
    users: [],
    itemCount: 0,
    page: extractPageMeta(new Headers(), current),
  };
  if (profile.isLocked) return { ...empty, isSelf, viewerSlug: viewer?.slug ?? null, relations: null };

  // OG only offers Following (Pending) on your own profile and shows Following anywhere else.
  const fetched = requested === 'following_pending' && (!isSelf || !initial) ? await list('following') : initial;
  if (!fetched) error(502, 'Trakt is having trouble loading this network.');
  const { response, type } = fetched;
  if (response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading this network.');
  const parsed = networkRowsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) error(502, 'Trakt returned an invalid network response.');

  const all = parsed.data.filter((row) => !row.user.deleted).map((row) => toProfileUser(row.user));
  const { rows: users, page } = type === 'following_pending'
    ? slicePage(all, current)
    : { rows: all, page: extractPageMeta(response.headers, current) };
  const itemCount = type === 'following_pending'
    ? all.length
    : positiveInt(response.headers.get('x-pagination-item-count'), 0);

  return {
    type,
    canFollow: settings?.permissions?.following !== false,
    users,
    itemCount,
    page,
    isSelf,
    viewerSlug: viewer?.slug ?? null,
    // Streamed: the cards render first, then their buttons. Only the cards' relations go to the browser.
    relations: viewer && token
      ? (locals.viewerLists ?? loadViewerLists({ client: api({ fetch, token }) })).then((lists) =>
        Object.fromEntries(users.map((user) => [user.slug, toViewerRelation(user.slug, lists)]))
      )
      : null,
  };
}
