import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { extractPageMeta } from '../api/extractPageMeta.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { DateOrder } from '../utils/formatDate.ts';
import { parseAdvancedFilters } from '../components/filters/advancedFilters.ts';
import { advancedFiltersQuery } from '../components/filters/advancedFiltersQuery.ts';
import { FILTERS_UPSELL_COOKIE } from '../components/filters/filtersUpsellCookie.ts';
import { type FilterSource, toFilterSources } from '../components/filters/watchNowFilter.ts';
import { type FadeHide, parseFadeHide } from '../components/filters/fadeHide.ts';
import { favoriteSlugs } from '../components/watchnow/watchNow.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { recommendationFilters } from './chartFilters.ts';
import { type ChartAlias, chartAliases, type ChartName, isChartAlias, isPeriodChart } from './chartNames.ts';
import { type ChartPeriod, chartPeriod } from './chartPeriod.ts';
import { type ChartRow, toChartCard } from './toChartCard.ts';

export type MediaType = 'shows' | 'movies';

type LoadChartParams = {
  fetch: typeof fetch;
  /** Recommendations need it, and the hide menu's watched and watchlisted options send it. */
  token: string | null;
  /** The request's cookies, for the fade and hide menu. */
  cookies: { get: (name: string) => string | undefined };
  /** The layout's data, for the viewer's date format and watch-now country. */
  parent: () => Promise<{ datePreferences: { order: DateOrder }; settings: ViewerSettings | null }>;
  url: URL;
  type: MediaType;
  chart: ChartName | ChartAlias;
  /** The optional path segment after a period chart. */
  period?: string;
};

type Query = {
  extended: 'full,images';
  page: number;
  limit: number;
  ignore_watched?: true;
  ignore_watchlisted?: true;
  // The advanced filters. @trakt/api 0.6.0's chart contracts only know some of them.
  [filter: string]: string | number | boolean | undefined;
};

// OG's `setup_pagination`: 38 a page unless `limit` says otherwise.
const PER_PAGE = 38;

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
}

type Client = ReturnType<typeof api>;

// Popular rows are the bare show or movie, so they're wrapped to look like the other charts' rows.
async function fetchPopular(client: Client, type: MediaType, query: Query) {
  if (type === 'shows') {
    const response = await client.shows.popular({ query });
    return response.status === 200
      ? { headers: response.headers, rows: response.body.map((show) => ({ show })) }
      : null;
  }

  const response = await client.movies.popular({ query });
  return response.status === 200
    ? { headers: response.headers, rows: response.body.map((movie) => ({ movie })) }
    : null;
}

// `@trakt/api` has no contract for the worker's `/shows|movies/recommendations`. OG asked for 38 and had no paging
// so the paging headers are dropped. The API hides watched items by default.
async function fetchRecommendations(
  fetch: typeof globalThis.fetch,
  token: string,
  type: MediaType,
  filters: Record<string, string>,
) {
  const search = new URLSearchParams({ extended: 'full,images', limit: `${PER_PAGE}`, ...filters });
  const response = await rawApiFetch({ fetch, token, path: `/${type}/recommendations?${search}` });
  if (response.status === 401) return 'signed-out';
  if (!response.ok) return null;

  const rows: ChartRow[] = await response.json();
  return { headers: new Headers(), rows };
}

const watchNowCountry = (settings: ViewerSettings | null) =>
  settings?.browsing?.watchnow?.country?.toLowerCase() || 'us';

// Watch-now routes are public, so no token goes with it. A failure only costs the sidebar its tiles.
const fetchSources = (fetch: typeof globalThis.fetch, country: string): Promise<Map<string, FilterSource>> =>
  rawApiFetch({ fetch, path: `/watchnow/sources/${country}` })
    .then(async (response) => (response.ok ? toFilterSources(await response.json(), country) : new Map()))
    .catch(() => new Map());

function signIn(url: URL): never {
  redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname)}`);
}

async function fetchRows(
  client: Client,
  type: MediaType,
  chart: Exclude<ChartName, 'recommendations'>,
  period: ChartPeriod,
  query: Query,
) {
  if (chart === 'popular') return fetchPopular(client, type, query);
  if (isPeriodChart(chart)) {
    const response = await client[type][chart === 'library' ? 'collected' : chart]({ params: { period }, query });
    return response.status === 200 ? { headers: response.headers, rows: response.body } : null;
  }

  const response = await client[type][chart]({ query });
  return response.status === 200 ? { headers: response.headers, rows: response.body } : null;
}

/**
 * Loads one chart page for SSR. The public charts go without the user's token: a stale cookie token would get a 401
 * from the worker for data that doesn't depend on it. Recommendations need one, and send a signed-out viewer to
 * sign in.
 */
export async function loadChart(
  { fetch, token, cookies, parent, url, type, chart, period: periodParam }: LoadChartParams,
) {
  if (isChartAlias(chart)) {
    redirect(301, `/${type}/${chartAliases[chart]}${periodParam ? `/${periodParam}` : ''}${url.search}`);
  }
  // Only the period charts take a second segment: `/shows/trending/weekly` is a 404, like OG.
  if (periodParam !== undefined && !isPeriodChart(chart)) error(404, 'Not Found');

  // The period the nav links keep. The charts without one link to the weekly default, as in OG.
  const period = chartPeriod(periodParam);
  const page = chart === 'recommendations' ? 1 : positiveInt(url.searchParams.get('page'), 1);
  const limit = positiveInt(url.searchParams.get('limit'), PER_PAGE);

  // OG's `filter-fade-shows-*` and `filter-hide-shows-*`, one cookie a menu section. The page fades and hides by the
  // overlay; the API also drops the `apiHideOptions` it runs natively, so those pages stay full.
  const fadeHide: FadeHide = {
    fade: parseFadeHide(cookies.get(`filter-fade-${type}`)),
    hide: parseFadeHide(cookies.get(`filter-hide-${type}`)),
  };
  // The advanced filters go to the API as they are in the URL, so SSR renders the filtered chart.
  const filters = parseAdvancedFilters(url.searchParams);
  const filterQuery = advancedFiltersQuery(filters, chart === 'recommendations' ? recommendationFilters : undefined);
  const query: Query = { extended: 'full,images', page, limit, ...filterQuery };
  const ignore = {
    ...(fadeHide.hide.includes('watched') && { ignore_watched: true as const }),
    ...(fadeHide.hide.includes('watchlisted') && { ignore_watchlisted: true as const }),
  };

  const publicRows = (chart: Exclude<ChartName, 'recommendations'>) =>
    fetchRows(api({ fetch }), type, chart, period, query);
  // A stale token fails the viewer's request, so the page falls back to the public one and the overlay hides.
  const viewerRows = async (chart: Exclude<ChartName, 'recommendations'>) =>
    (await fetchRows(api({ fetch, token }), type, chart, period, { ...query, ...ignore })) ?? publicRows(chart);

  // Watch now filters by the viewer's country and favorites, which the API reads from their token.
  const viewer = Object.keys(ignore).length > 0 || filters.watchnow.length > 0;
  const layout = parent();
  const [response, { datePreferences, settings }, filterSources] = await Promise.all([
    chart === 'recommendations'
      ? (token ? fetchRecommendations(fetch, token, type, filterQuery) : signIn(url))
      : token && viewer
      ? viewerRows(chart)
      : publicRows(chart),
    layout,
    // The sidebar shows watch-now filters as service tiles, so it needs the country's services.
    filters.watchnow.length > 0
      ? layout.then(({ settings }) => fetchSources(fetch, watchNowCountry(settings)))
      : undefined,
  ]);
  if (response === 'signed-out') signIn(url);
  if (!response) error(502, 'The Trakt API could not load this chart.');

  const { headers } = response;
  const country = watchNowCountry(settings);
  const favorites = favoriteSlugs(settings?.browsing?.watchnow?.favorites ?? [], country, country);
  // Only the picked services go to the page: the panel fetches the whole list itself when it opens.
  const picked = new Set(filters.watchnow.flatMap((value) => (value === 'favorites' ? favorites : [value])));

  return {
    type,
    chart,
    period,
    fadeHide,
    filters,
    filterSources: filterSources && new Map([...filterSources].filter(([slug]) => picked.has(slug))),
    watchNowCountry: country,
    watchNowFavorites: favorites,
    upsellHidden: cookies.get(FILTERS_UPSELL_COOKIE) !== undefined,
    cards: response.rows.map((row) => toChartCard(row, { chart, now: new Date(), order: datePreferences.order })),
    page: extractPageMeta(headers, page),
    /** The chart's size, for the trending under-title. */
    itemCount: positiveInt(headers.get('x-pagination-item-count'), 0),
    /** Everyone watching something on the chart right now. Only trending sends it. */
    watcherCount: positiveInt(headers.get('x-trending-user-count'), 0),
  };
}
