import { error, redirect } from '@sveltejs/kit';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { FilterSource } from '../../components/filters/watchNowFilter.ts';
import type { HeaderUser } from '../../components/header/HeaderUser.ts';
import type { OnDeckItem } from '../../components/media/OnDeckItem.ts';
import { loadListFilterSources } from '../../lists/loadListFilterSources.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { fetchDroppedProgress } from './fetchDroppedProgress.ts';
import { fetchProgressTotals } from './fetchProgressTotals.ts';
import { progressHideParams, readProgressHide } from './progressHide.ts';
import { type ProgressRowData, progressRowsSchema } from './progressRowsSchema.ts';
import { apiProgressSort, progressSort } from './progressSort.ts';
import type { ProgressTotals } from './ProgressTotals.ts';
import { isProgressType, type ProgressType, progressTypes } from './progressTypes.ts';
import { toProgressOnDeck } from './toProgressOnDeck.ts';
import { type ProgressRow, toProgressRow } from './toProgressRow.ts';

type Params = {
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  params: { id: string; type?: string; sort?: string };
  url: URL;
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{
    profile: ProfileUser;
    isSelf: boolean;
    user: HeaderUser | null;
    settings: ViewerSettings | null;
    datePreferences: DatePreferences;
  }>;
  /** For the rows' relative dates. */
  now?: Date;
};

// OG's `per(50)`, 48 in grid view (eight rows of six),.
const PER_PAGE = 50;
const GRID_PER_PAGE = 48;

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

/** The filters every read of this page shares: hide toggles, title terms, streaming services and VIP lists. */
function filterQuery(url: URL, hide: Record<string, string>): Record<string, string> {
  const search = url.searchParams;
  const pick = (key: string) => {
    const value = search.get(key)?.trim();
    return value ? { [key]: value } : {};
  };
  return {
    ...hide,
    ...pick('terms'),
    ...pick('watchnow'),
    ...pick('list'),
    ...(search.get('exclude') === 'true' && { exclude: 'true' }),
  };
}

/**
 * `/users/:id/progress(/:type)(/:sort_by/:sort_how)`: one row a show, 50 to a page,
 * over `/users/:id/progress/{watched,collection}` with `include_seasons` (N, Official-gated). Signed-in only, like OG.
 * The viewer's own settings pick grid view and simple bars; on your own profile, your saved sort and Calculate Up Next
 * Using too (the worker applies your Include Specials itself). Another viewer can't read the owner's, so they get
 * OG's defaults. The summary
 * strip's totals stream in after the page. The Dropped tab, your own profile only, narrows Watched to the shows you
 * dropped (`fetchDroppedProgress`).
 */
export async function loadProgress({ fetch, locals, params, url, cookies, parent, now = new Date() }: Params) {
  if (!locals.token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);

  const type: ProgressType = params.type && isProgressType(params.type) ? params.type : 'watched';
  const { profile, isSelf, settings, datePreferences } = await parent();
  // `/users/hidden/*` only reads the viewer's own rows, so someone else's Dropped tab is cut: it opens Watched.
  if (progressTypes[type].ownOnly && !isSelf) {
    redirect(302, url.pathname.replace(`/progress/${type}`, '/progress/watched') + url.search);
  }
  const { kind } = progressTypes[type];
  const saved = settings?.browsing?.progress?.[progressTypes[type].settings];
  const sort = progressSort({ segments: params.sort, saved: isSelf ? saved : null });
  const hide = readProgressHide({ cookie: cookies.get('filter-hide-progress'), search: url.searchParams, type: kind });
  const grid = Boolean(saved?.grid_view);
  // "Calculate Up Next Using: Last episode watched" (or added to library), the worker's `last_activity`.
  const lastActivity: Record<string, string> = isSelf && saved?.use_last_activity
    ? { last_activity: progressTypes[type].settings }
    : {};
  const filters: Record<string, string> = { ...filterQuery(url, progressHideParams(hide)), ...lastActivity };

  const shell = {
    type,
    sort,
    hide,
    grid,
    simple: Boolean(saved?.simple_progress),
    terms: filters.terms ?? '',
    watchnow: filters.watchnow,
    isSelf,
    datePreferences,
  };
  const empty = {
    ...shell,
    rows: [] as ProgressRow[],
    onDeck: [] as OnDeckItem[],
    total: 0,
    page: extractPageMeta(new Headers(), 1),
    totals: Promise.resolve<ProgressTotals | null>(null),
    filterSources: new Map<string, FilterSource>(),
  };
  if (profile.isLocked) return empty;

  const current = positiveInt(url.searchParams.get('page'), 1);
  const limit = grid ? GRID_PER_PAGE : PER_PAGE;
  const base = `/users/${encodeURIComponent(params.id)}/progress/${progressTypes[type].api}`;
  const query = new URLSearchParams({
    ...filters,
    include_seasons: 'true',
    extended: 'full,images',
    page: String(current),
    limit: String(limit),
  });
  const api = apiProgressSort(sort);
  const sorted = `${base}/${api.by}/${api.how}`;
  const path = `${sorted}?${query}`;
  const read = (token: string | null) => rawApiFetch({ fetch, token, path });
  const toRows = (rows: readonly ProgressRowData[], droppedAt?: ReadonlyMap<number, string>) => ({
    rows: rows.map((row) =>
      toProgressRow({ row, type: kind, datePreferences, now, droppedAt: droppedAt?.get(row.show.ids.trakt) })
    ),
    onDeck: grid ? rows.flatMap((row) => toProgressOnDeck({ row, username: profile.slug }) ?? []) : [],
  });

  if (type === 'dropped') {
    const [dropped, filterSources] = await Promise.all([
      fetchDroppedProgress({ fetch, token: locals.token, path: sorted, filters, page: current, limit })
        .catch(() => error(502, 'Trakt is having trouble loading this progress.')),
      loadListFilterSources({ fetch, watchnow: filters.watchnow, settings }),
    ]);
    // A token that stopped working can't read your dropped shows, so the tab renders empty until the browser renews.
    if (!dropped) return { ...empty, filterSources };
    return {
      ...shell,
      ...toRows(dropped.rows, dropped.droppedAt),
      total: dropped.total,
      page: { type: 'paginated' as const, current: Math.min(current, dropped.pageCount), total: dropped.pageCount },
      totals: Promise.resolve<ProgressTotals | null>(dropped.totals),
      filterSources,
    };
  }

  const [first, filterSources] = await Promise.all([
    read(locals.token),
    loadListFilterSources({ fetch, watchnow: filters.watchnow, settings }),
  ]);
  // A token that stopped working reads the page logged out: the server never refreshes, the browser does.
  const response = first.status === 401 ? await read(null) : first;
  if (response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading this progress.');

  const parsed = progressRowsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) error(502, 'Trakt returned an invalid progress response.');

  const token = first.status === 401 ? null : locals.token;
  const total = positiveInt(response.headers.get('x-pagination-item-count'), 0);
  return {
    ...shell,
    ...toRows(parsed.data),
    total,
    page: extractPageMeta(response.headers, current),
    // Streamed: the rows render first, the strip fills in once every page is counted.
    totals: fetchProgressTotals({ fetch, token, base, filters, total }),
    filterSources,
  };
}
