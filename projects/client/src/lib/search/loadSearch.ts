import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { extractPageMeta } from '../api/extractPageMeta.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { DateOrder } from '../utils/formatDate.ts';
import { findSearchType } from './findSearchType.ts';
import { isIdType } from './isIdType.ts';
import { toSearchCard } from './toSearchCard.ts';
import { toSearchImageType } from './toSearchImageType.ts';
import { toSearchListRow } from './toSearchListRow.ts';
import { searchRowsSchema } from './searchRowsSchema.ts';
import { searchFilters } from './searchFilters.ts';
import { searchUsersSchema } from './searchUsersSchema.ts';
import { toSearchUserCard } from './toSearchUserCard.ts';

type LoadSearchParams = {
  fetch: typeof fetch;
  token?: string | null;
  cookies: { get: (name: string) => string | undefined };
  /** The layout's viewer settings carry the search image type. */
  parent: () => Promise<{ datePreferences: { order: DateOrder }; settings?: unknown }>;
  url: URL;
  /** The `/search/<type>` segment. Left out, it's Shows & Movies. */
  type?: string;
  /** `/search/<type>/<id>` puts the query in the path. */
  id?: string;
};

// OG's `set_params`: 36 a page unless `limit` says otherwise.
const PER_PAGE = 36;
const EXTENDED = 'full,images';
// Users come from API, where `full` brings the avatar and `vip` the cover.
const USERS_EXTENDED = 'full,vip';

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
}

// The tabs where a poster stands in for the title.
const POSTER_TITLES = new Set(['', 'shows', 'movies']);
// The tabs that hide the type tag.
const NO_TYPE_TAG = new Set(['shows', 'movies', 'episodes', 'people']);

/** Public searches omit the viewer token; typed Hide requests need it. A single ID match redirects, like OG. */
export async function loadSearch({ fetch, token, cookies, parent, url, type: slug, id }: LoadSearchParams) {
  const type = findSearchType(slug);
  if (!type) error(404, 'Not Found');

  const query = (id ?? url.searchParams.get('query') ?? url.searchParams.get('q') ?? '').trim();
  const page = positiveInt(url.searchParams.get('page'), 1);
  const limit = Math.min(positiveInt(url.searchParams.get('limit'), PER_PAGE), 50);

  const filters = searchFilters({ slug: type.slug, search: url.searchParams, cookies });
  const hide = filters.fadeHide.hide.map((id) => id === 'watchlisted' ? 'watchlist' : id).join(',');

  const search = async () => {
    // OG listed everything by rank for a blank query. The worker wants one, so that's the empty state.
    if (!query) return null;

    if ('idType' in type) {
      // `id_type` narrows the lookup to one kind, like OG's `/search/trakt?query=1&id_type=movie`.
      const kind = url.searchParams.get('id_type');
      const response = await api({ fetch }).search.lookup({
        params: { id_type: type.idType, id: query },
        query: { extended: EXTENDED, ...(kind ? { type: kind } : {}) },
      });
      return response.status === 200 ? { hits: response.body, headers: null } : 'failed';
    }

    if (type.slug === 'users') {
      // Off the typed contract: API matches usernames that start with the query.
      const params = new URLSearchParams({ query, page: String(page), limit: String(limit), extended: USERS_EXTENDED });
      const response = await rawApiFetch({ fetch, path: `/search/user?${params}` });
      if (response.status !== 200) return 'failed';
      const users = searchUsersSchema.safeParse(await response.json().catch(() => null));
      if (!users.success) error(502, 'The Trakt API returned invalid search results.');
      return { hits: [], users: users.data, headers: response.headers };
    }

    if (!('text' in type)) return null;

    const publicQuery = { query, page, limit, extended: EXTENDED } as const;
    const viewerQuery = { ...publicQuery, hide };
    const request = (viewer: boolean) =>
      api({ fetch, token: viewer ? token : null }).search.query({
        params: { type: type.text },
        query: viewer ? viewerQuery : publicQuery,
      });
    const viewer = Boolean(token && hide);
    const first = await request(viewer);
    // The browser renews a stale token; SSR must still render a usable public search.
    const response = viewer && first.status === 401 ? await request(false) : first;
    return response.status === 200 ? { hits: response.body, headers: response.headers } : 'failed';
  };

  const [result, { datePreferences, settings }] = await Promise.all([search(), parent()]);
  if (result === 'failed') error(502, 'The Trakt API could not load this search.');

  const parsed = searchRowsSchema.safeParse(result?.hits ?? []);
  if (!parsed.success) error(502, 'The Trakt API returned invalid search results.');
  const hits = parsed.data;
  const imageType = toSearchImageType({ settings, slug: type.slug });
  const cardOptions = {
    typeTag: !NO_TYPE_TAG.has(type.slug),
    posterTitles: POSTER_TITLES.has(type.slug),
    premiereTag: isIdType(type),
    imageType,
    now: new Date(),
    order: datePreferences.order,
  };
  const cards = hits.map((hit) => toSearchCard(hit, cardOptions)).filter((card) => card !== null);

  // One match on an ID goes straight to it.
  const [only] = cards;
  if (isIdType(type) && hits.length === 1 && only) redirect(301, only.href);

  const headers = result?.headers;
  const count = headers ? positiveInt(headers.get('x-pagination-item-count'), hits.length) : hits.length;
  const pagination = headers ? extractPageMeta(headers, page) : { type: 'paginated' as const, current: 1, total: 1 };
  return {
    filters,
    slug: type.slug,
    idMode: isIdType(type),
    query,
    imageType,
    cards,
    lists: hits.map(toSearchListRow).filter((row) => row !== null),
    // OG only listed public, active accounts (`User.not_private.alive`).
    users: (result?.users ?? [])
      .filter(({ user }) => !user.private && !user.deleted)
      .map(({ user }) => toSearchUserCard(user)),
    count,
    // Signed out, the worker's count stops at the page size, so there may be more.
    countCapped: Boolean(headers) && count >= limit && (pagination.type !== 'paginated' || pagination.total === 1),
    page: pagination,
  };
}
