import { error } from '@sveltejs/kit';
import type { PageMeta } from '../api/PageMeta.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { listCoverOf } from './listCoverOf.ts';
import { type ListItemRow, listItemRowsSchema } from './listItemRowsSchema.ts';
import { listPageMeta } from './listPageMeta.ts';
import type { ListQuery } from './ListQuery.ts';
import { type ListSort, resolveListSort } from './resolveListSort.ts';
import { type ListItemCard, toListItemCard } from './toListItemCard.ts';
import { type ListStats, toListStats } from './toListStats.ts';

// Sorts about the viewer: the worker needs their token to order by them.
const VIEWER_SORTS = ['my_rating', 'watched', 'collected'];

type ItemsRequest = {
  fetch: typeof globalThis.fetch;
  token: string | null;
  /** The items path before its `/:type/:sort_by/:sort_how` segments. */
  base: string;
  query: ListQuery;
  /** Left out, the worker applies the list's default. */
  sort?: ListSort;
  /** The stats only need runtimes and ids, not artwork. */
  extended?: string;
};

export type ListItems = { status: number; rows: readonly ListItemRow[]; headers: Headers };

/** A page of a list's items: `<base>/:types/:sort_by/:sort_how` with the genre filter and OG's page size. */
export async function fetchListItems(
  { fetch, token, base, query, sort, extended = 'full,images' }: ItemsRequest,
): Promise<ListItems> {
  const types = query.types.length > 0 ? query.types.join(',') : 'all';
  const path = sort ? `/${types}/${sort.by}/${sort.how}` : query.types.length > 0 ? `/${types}` : '';
  const search = new URLSearchParams({
    extended,
    page: String(query.page),
    limit: String(query.limit),
    ...(query.genres.length > 0 && { genres: query.genres.join(',') }),
  });
  if (query.terms) search.set('terms', query.terms);
  if (query.watchnow) search.set('watchnow', query.watchnow);
  if (query.hide?.length) search.set('hide', query.hide.join(','));
  for (const id of query.hide ?? []) search.set(`hide_${id === 'nonotes' ? 'no_notes' : id}`, 'true');
  const response = await rawApiFetch({ fetch, token, path: `${base}${path}?${search}` });
  if (response.status !== 200) return { status: response.status, rows: [], headers: response.headers };
  const rows = listItemRowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) error(502, 'Trakt returned an invalid list.');
  return { status: 200, rows: rows.data, headers: response.headers };
}

/** The sort the worker applied, from `X-Sort-By` and `X-Sort-How`. */
export function usedListSort(headers: Headers): { by: string | null; how: string | null } {
  return { by: headers.get('x-sort-by'), how: headers.get('x-sort-how') };
}

/** The sort the URL asked for, as the items request sends it. */
export function urlListSort(query: ListQuery): ListSort | undefined {
  return query.sortBy ? { by: query.sortBy, how: query.sortHow ?? 'asc' } : undefined;
}

// The worker's largest page, and enough of them for a VIP's 5,000-item watchlist (`TRAKT_WATCHLIST_ITEM_LIMIT_VIP`).
const STATS_PAGE = 250;
const MAX_STATS_PAGES = 20;

type StatsRequest = Omit<ItemsRequest, 'sort' | 'extended'> & { total: number; withItems: boolean };

/**
 * The stats bar counts every item that matches the filters, and the worker pages them, so this reads every page at
 * once, in rank order so the pages don't shift under each other. A list too big for that, or a failed page, leaves
 * the bar without its computed stats.
 */
async function fetchListStats({ total, withItems, query, ...request }: StatsRequest): Promise<ListStats | null> {
  const pages = Math.ceil(total / STATS_PAGE);
  if (pages > MAX_STATS_PAGES) return null;
  const read = (page: number) =>
    fetchListItems({
      ...request,
      query: { ...query, page, limit: STATS_PAGE },
      sort: { by: 'rank', how: 'asc' },
      extended: 'full',
    });
  const results = await Promise.all(Array.from({ length: pages }, (_, i) => read(i + 1))).catch(() => null);
  if (!results || results.some(({ status }) => status !== 200)) return null;
  return toListStats(results.flatMap(({ rows }) => rows), { withItems });
}

type LoadListItemsParams = {
  fetch: typeof globalThis.fetch;
  token: string | null;
  base: string;
  query: ListQuery;
  /** The read made alongside the frame's load, in the URL's sort. */
  first: ListItems;
  /** `first` was read with the viewer's token. */
  firstHasToken?: boolean;
  /** The list's own default sort. */
  fallback: ListSort;
  viewerIsVip: boolean;
  /** Only the viewer's token reads this list's items. */
  needsToken: boolean;
  /** A VIP owner's list puts its first ranked item on the profile cover. */
  ownerIsVip: boolean;
  /** A signed-in viewer's stats carry the ids the Watched and Collected percentages look up. */
  viewerSignedIn: boolean;
  datePreferences: DatePreferences;
};

/**
 * The items half of a list page, shared by personal lists, the watchlist and favorites: the sort
 * the page shows, a page of cards in it, the pagination and the VIP cover. The first read is reused when it's already
 * in that sort and was allowed to be; a list only the viewer can see, or a sort about the viewer, needs the token.
 */
export async function loadListItems(
  {
    fetch,
    token,
    base,
    query,
    first,
    firstHasToken = false,
    fallback,
    viewerIsVip,
    needsToken,
    ownerIsVip,
    viewerSignedIn,
    datePreferences,
  }: LoadListItemsParams,
) {
  const sort = resolveListSort({ query, fallback, vip: viewerIsVip });
  const needsViewer = Boolean(token) &&
    (needsToken || VIEWER_SORTS.includes(sort.by) || Boolean(query.watchnow) || (query.hide?.length ?? 0) > 0);
  const used = usedListSort(first.headers);
  const reuse = (!needsViewer || firstHasToken) && first.status === 200 && used.by === sort.by &&
    used.how === sort.how;
  const viewerToken = needsViewer ? token : null;
  const isFirstRankedPage = sort.by === 'rank' && sort.how === 'asc' && query.page === 1 &&
    query.types.length === 0 && query.genres.length === 0 && !query.terms && !query.watchnow && !query.hide?.length;
  const firstRanked = ownerIsVip && !isFirstRankedPage
    ? fetchListItems({
      fetch,
      token: viewerToken,
      base,
      query: { ...query, types: [], genres: [], hide: [], terms: undefined, watchnow: undefined, page: 1, limit: 1 },
      sort: { by: 'rank', how: 'asc' },
    }).catch(() => null)
    : null;

  const [fetched, ranked] = await Promise.all([
    reuse ? first : fetchListItems({ fetch, token: viewerToken, base, query, sort }),
    firstRanked,
  ]);
  // A stale token keeps the anonymous answer: the server never refreshes, the browser does.
  const items = fetched.status === 401 && first.status === 200 ? first : fetched;
  if ([403, 404].includes(items.status)) error(404, 'Page Not Found');
  if (items.status !== 200) error(502, 'Trakt is having trouble loading this list.');

  const cards: ListItemCard[] = items.rows.map((row) => toListItemCard(row, { sortBy: sort.by, datePreferences }));
  const page: PageMeta = listPageMeta({
    headers: items.headers,
    current: query.page,
    limit: query.limit,
    received: items.rows.length,
  });
  const total = Number(items.headers.get('x-pagination-item-count')) || cards.length;
  // Most lists fit on their first page, so the stats come from it and render with the page. Longer ones stream in.
  const complete = query.page === 1 && (items.rows.length < query.limit || items.rows.length >= total);
  const withItems = viewerSignedIn;
  const stats: ListStats | Promise<ListStats | null> = complete
    ? toListStats(items.rows, { withItems })
    : fetchListStats({ fetch, token: viewerToken, base, query, total, withItems });

  return {
    sort,
    cards,
    page,
    total,
    /** The stats bar's whole-list numbers, streamed when they take more reads. */
    stats,
    /** Read by the profile frame (`routes/users/[id]/+layout.svelte`). */
    listCover: ownerIsVip ? listCoverOf(ranked ? ranked.rows.at(0) : items.rows.at(0)) : undefined,
  };
}
