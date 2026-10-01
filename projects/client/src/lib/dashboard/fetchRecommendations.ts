import { type MovieResponse, movieResponseSchema, type ShowResponse, showResponseSchema } from '@trakt/api';
import type { api } from '../api/api.ts';
import { contractSchema } from '../api/contractSchema.ts';
import { type ChartCard, toChartCard } from '../charts/toChartCard.ts';
import type { DateOrder } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { DashboardSettings } from './DashboardSettings.ts';

type Client = ReturnType<typeof api>;

type FetchRecommendationsParams = {
  api: Client;
  /** How many members the viewer follows (`fetchFollowingCount`), for the help line. */
  following: Promise<number | null>;
  now: Date;
  order: DateOrder;
  /** The ignore-library and ignore-watchlisted switches. Left out, both off, as in OG. */
  ignore?: DashboardSettings['recommendations'];
};

export type DashboardRecommendations = {
  /** Null when that column's request failed, so the other still shows. */
  readonly shows: readonly ChartCard[] | null;
  readonly movies: readonly ChartCard[] | null;
  /** Null when the stats didn't load: the help line is left out rather than guessed. */
  readonly following: number | null;
};

/** OG's dashboard asks for 10 of each. */
const LIMIT = 10;

const showSchema = contractSchema(showResponseSchema);
const movieSchema = contractSchema(movieResponseSchema);

// These API flags exclude library and watchlist items as requested.
// @trakt/api 0.6.0 lacks `hide_collected`, but passes query keys through.
function queryFor({ ignoreCollected, ignoreWatchlisted }: DashboardSettings['recommendations']) {
  const query = {
    limit: LIMIT,
    extended: 'full,images' as const,
    ...(ignoreWatchlisted && { ignore_watchlisted: true }),
    ...(ignoreCollected && { ignore_collected: true, hide_collected: true }),
  };
  return query;
}

// An API body is parsed row by row; one that doesn't fit is dropped, not the whole column.
function parsed<T>(rows: readonly unknown[], schema: { safeParse: (row: unknown) => { success: boolean; data?: T } }) {
  return rows.flatMap((row) => {
    const result = schema.safeParse(row);
    return result.success && result.data !== undefined ? [result.data] : [];
  });
}

// The chart card's fields, with the poster in place of the fanart, as OG's poster cards showed it.
function toCard(row: { show: ShowResponse } | { movie: MovieResponse }, now: Date, order: DateOrder): ChartCard {
  const media = 'show' in row ? row.show : row.movie;
  return {
    ...toChartCard(row, { chart: 'recommendations', now, order }),
    image: imageUrl(media.images?.poster?.at(0), 'thumb'),
  };
}

async function shows(client: Client, ignore: DashboardSettings['recommendations']) {
  const response = await client.recommendations.shows.recommend({ query: queryFor(ignore) });
  if (response.status !== 200) return null;
  const rows = ignore.ignoreCollected ? parsed<ShowResponse>(response.body, showSchema) : response.body;
  return rows.map((show) => ({ show }));
}

async function movies(client: Client, ignore: DashboardSettings['recommendations']) {
  const response = await client.recommendations.movies.recommend({ query: queryFor(ignore) });
  if (response.status !== 200) return null;
  const rows = ignore.ignoreCollected ? parsed<MovieResponse>(response.body, movieSchema) : response.body;
  return rows.map((movie) => ({ movie }));
}

/**
 * The Show and Movie Recommendations: ten of each from the recommender, which leaves out what the
 * viewer has watched and, with those settings, what's in their library or on their watchlist, and the following count
 * for the help line. Each column fails on its own.
 */
export async function fetchRecommendations(
  { api, following, now, order, ignore = { ignoreCollected: false, ignoreWatchlisted: false } }:
    FetchRecommendationsParams,
): Promise<DashboardRecommendations> {
  const [showRows, movieRows, count] = await Promise.all([
    shows(api, ignore).catch(() => null),
    movies(api, ignore).catch(() => null),
    following,
  ]);

  return {
    shows: showRows?.map((row) => toCard(row, now, order)) ?? null,
    movies: movieRows?.map((row) => toCard(row, now, order)) ?? null,
    following: count,
  };
}
