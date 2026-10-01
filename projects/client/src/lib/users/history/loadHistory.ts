import type { UserStatsResponse } from '@trakt/api';
import { error, redirect } from '@sveltejs/kit';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import type { PageMeta } from '../../api/PageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { type FadeHide, parseFadeHide } from '../../components/filters/fadeHide.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { withShowPosters } from '../withShowPosters.ts';
import { type HistoryCounts, historyCounts } from './historyCounts.ts';
import { type HistoryFilters, historyFilters } from './historyFilters.ts';
import { type HistoryRow, historyRowsSchema, type WatchedShowRow, watchedShowsSchema } from './historyRowsSchema.ts';
import { type HistoryType, isHistoryType } from './historyTypes.ts';
import {
  historyItemTitle,
  toHistoryCard,
  toHistoryDays,
  toShowsFromPlays,
  toWatchedShowCard,
} from './toHistoryCard.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  params: { id: string; type?: string; sort?: string };
  url: URL;
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{
    profile: ProfileUser;
    stats: UserStatsResponse | null;
    user: { readonly slug: string } | null;
    datePreferences: DatePreferences;
  }>;
};

// OG's `per(params[:limit] || 60)`.
const PER_PAGE = 60;
// The worker's MAX_LIMIT.
const MAX_LIMIT = 250;
// ponytail: the filtered Shows tab reads up to 2,000 plays and groups them by show. A long genre or Watch Now filter
// on a heavy account only lists the shows among its 2,000 newest matching plays; page further if anyone notices.
const MAX_PAGES = 8;

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

type Fetched = {
  status: number;
  plays: HistoryRow[];
  shows: WatchedShowRow[];
  total: number;
  page: PageMeta;
};

function query(filters: HistoryFilters, page: number, limit: number) {
  return new URLSearchParams({
    extended: 'full,images',
    page: String(page),
    limit: String(limit),
    ...(filters.startAt && { start_at: filters.startAt }),
    ...(filters.endAt && { end_at: filters.endAt }),
    ...(filters.genre && { genres: filters.genre }),
    ...(filters.watchnow && { watchnow: filters.watchnow }),
  });
}

async function read(fetch: typeof globalThis.fetch, token: string | null, path: string) {
  const response = await rawApiFetch({ fetch, token, path });
  const body = response.status === 200 ? await response.json().catch(() => null) : null;
  return { response, body };
}

const total = (headers: Headers) => positiveInt(headers.get('x-pagination-item-count'), 0);

/**
 * One page of history: the plays, or the Shows tab's shows. The unfiltered Shows tab is the watched list, which pages
 * by last watched; filtered, it groups the filtered plays by show, since the watched list takes no filters.
 */
async function fetchPage(
  { fetch, token, base, type, filters, current, limit }: {
    fetch: typeof globalThis.fetch;
    token: string | null;
    base: string;
    type: HistoryType;
    filters: HistoryFilters;
    current: number;
    limit: number;
  },
): Promise<Fetched> {
  const empty = { plays: [], shows: [], total: 0, page: extractPageMeta(new Headers(), current) };
  const invalid = (status: number) => ({ ...empty, status: status === 200 ? 502 : status });

  if (type === 'shows' && !filters.item) {
    if (!filters.startAt && !filters.endAt && !filters.genre && !filters.watchnow) {
      const { response, body } = await read(fetch, token, `${base}/watched/shows?${query({}, current, limit)}`);
      const rows = watchedShowsSchema.safeParse(body);
      if (!rows.success) return invalid(response.status);
      return {
        ...empty,
        status: 200,
        shows: await withShowPosters(fetch, rows.data),
        total: total(response.headers),
        page: extractPageMeta(response.headers, current),
      };
    }

    const page = (n: number) => read(fetch, token, `${base}/history/shows?${query(filters, n, MAX_LIMIT)}`);
    const first = await page(1);
    const firstRows = historyRowsSchema.safeParse(first.body);
    if (!firstRows.success) return invalid(first.response.status);
    const count = positiveInt(first.response.headers.get('x-pagination-page-count'), 1);
    const rest = await Promise.all(Array.from({ length: Math.min(count, MAX_PAGES) - 1 }, (_, i) => page(i + 2)));
    const shows = toShowsFromPlays([
      ...firstRows.data,
      ...rest.flatMap(({ body }) => historyRowsSchema.safeParse(body).data ?? []),
    ]);
    const pages = Math.max(1, Math.ceil(shows.length / limit));
    return {
      ...empty,
      status: 200,
      shows: shows.slice((current - 1) * limit, current * limit),
      total: shows.length,
      page: { type: 'paginated', current: Math.min(current, pages), total: pages },
    };
  }

  const { item } = filters;
  const path = item ? `/history/${item.type}s/${item.id}` : type === 'all' ? '/history' : `/history/${type}`;
  const { response, body } = await read(fetch, token, `${base}${path}?${query(filters, current, limit)}`);
  if (response.status === 404) return { ...empty, status: 404 };
  const rows = historyRowsSchema.safeParse(body);
  if (!rows.success) return invalid(response.status);
  return {
    ...empty,
    status: 200,
    plays: rows.data,
    total: total(response.headers),
    page: extractPageMeta(response.headers, current),
  };
}

/**
 * `/users/:id/history(/:type)`: newest plays first, as poster cards under day dividers.
 * Public reads go without the token alongside the frame's load; a private profile the viewer may see is read again
 * with it.
 */
export async function loadHistory({ fetch, locals, params, url, cookies, parent }: Params) {
  const type: HistoryType = params.type && isHistoryType(params.type) ? params.type : 'all';
  const base = `/users/${encodeURIComponent(params.id)}`;
  // OG's sort segments (`/history/movies/plays/asc`). The API only serves Watched Date, so they drop.
  if (params.sort) redirect(302, `${base}/history${type === 'all' ? '' : `/${type}`}${url.search}`);

  const current = positiveInt(url.searchParams.get('page'), 1);
  const limit = Math.min(positiveInt(url.searchParams.get('limit'), PER_PAGE), MAX_LIMIT);
  const layout = parent();
  // A bare date is read in the viewer's zone, which waits on the layout. Instants and no range don't.
  const range = [url.searchParams.get('start_at'), url.searchParams.get('end_at')].filter(Boolean);
  const bare = range.some((value) => !/(Z|[+-]\d\d:?\d\d)$/i.test(value ?? ''));
  const filters = historyFilters(url.searchParams, type, bare ? (await layout).datePreferences.timeZone : 'UTC');

  const request = { fetch, base, type, filters, current, limit };
  const [anonymous, { profile, stats, user, datePreferences }] = await Promise.all([
    fetchPage({ ...request, token: null }),
    layout,
  ]);
  // OG sent signed-out visitors past page 1 to sign in.
  if (current > 1 && !user) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);

  const fadeHide: FadeHide = { fade: parseFadeHide(cookies.get('filter-fade-history')), hide: [] };
  const dividers = cookies.get('filter-hide-dividers') !== '1';
  const shell = { type, filters, fadeHide, dividers, datePreferences };
  if (profile.isLocked) {
    const counts: HistoryCounts = {};
    return {
      ...shell,
      screenshots: false,
      days: [],
      counts,
      page: extractPageMeta(new Headers(), current),
      itemTitle: undefined,
    };
  }

  // A private profile shows its plays to the owner and approved followers only. A token that stopped working keeps
  // the anonymous read: the server never refreshes, the browser does.
  const viewer = profile.isPrivate && locals.token ? await fetchPage({ ...request, token: locals.token }) : null;
  const result = viewer?.status === 200 ? viewer : anonymous;
  if (result.status === 404) error(404, 'Page Not Found');
  if (result.status !== 200) error(502, 'Trakt is having trouble loading this history.');

  const screenshots = type === 'episodes' || (filters.item !== undefined && filters.item.type !== 'movie');
  const cards = result.shows.length > 0
    ? result.shows.map((row) => toWatchedShowCard(row, datePreferences))
    : result.plays.map((row) => toHistoryCard(row, { screenshots, datePreferences }));

  return {
    ...shell,
    screenshots,
    days: toHistoryDays(cards, datePreferences),
    counts: historyCounts({ type, filters, stats, total: result.total }),
    page: result.page,
    itemTitle: filters.item ? historyItemTitle(filters.item, result.plays.at(0)) : undefined,
  };
}
