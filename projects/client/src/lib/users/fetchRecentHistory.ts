import type { EpisodeActivityHistoryResponse, MovieActivityHistoryResponse } from '@trakt/api';
import type { api } from '../api/api.ts';

type FetchRecentHistoryParams = {
  client: ReturnType<typeof api>;
  /** A user's slug, or `me` for the token's owner. */
  id: string;
  now: Date;
};

export type RecentHistory = {
  /** The window's start: midnight UTC, 30 days back. */
  readonly start: string;
  readonly episodes: readonly EpisodeActivityHistoryResponse[];
  readonly movies: readonly MovieActivityHistoryResponse[];
  /** False when any page failed, which leaves the rows short. */
  readonly complete: boolean;
};

const DAY = 86_400_000;
// The worker's MAX_LIMIT.
const PAGE_SIZE = 250;
// ponytail: 8 pages is 2,000 plays in 30 days. Past that the Last 30 Days totals undercount; page further if anyone
// watches that much.
const MAX_PAGES = 8;

// OG's `Date.today - 30.days`: midnight UTC, 30 days back. In every time zone that covers the 30 days up to today.
const windowStart = (now: Date) => new Date(Math.floor(now.getTime() / DAY) * DAY - 30 * DAY).toISOString();

/** Page 1, then the rest of the pages together. */
async function allPages<R extends { status: number; headers: Headers }>(page: (n: number) => Promise<R>) {
  const first = await page(1);
  const count = first.status === 200 ? Number(first.headers.get('x-pagination-page-count')) || 1 : 1;
  return [first, ...await Promise.all(Array.from({ length: Math.min(count, MAX_PAGES) - 1 }, (_, i) => page(i + 2)))];
}

/**
 * A user's episode and movie plays of the last 30 days, with the runtimes (`extended=full`), for the profile's Last 30
 * Days box and Most Watched tab, and the dashboard's Last 30 Days panel.
 */
export async function fetchRecentHistory({ client, id, now }: FetchRecentHistoryParams): Promise<RecentHistory> {
  const start = windowStart(now);
  const query = { start_at: start, extended: 'full', limit: PAGE_SIZE } as const;

  const [episodes, movies] = await Promise.all([
    allPages((page) => client.users.history.episodes({ params: { id }, query: { ...query, page } })),
    allPages((page) => client.users.history.movies({ params: { id }, query: { ...query, page } })),
  ]);

  return {
    start,
    episodes: episodes.flatMap((response) => response.status === 200 ? response.body : []),
    movies: movies.flatMap((response) => response.status === 200 ? response.body : []),
    complete: [...episodes, ...movies].every((response) => response.status === 200),
  };
}
