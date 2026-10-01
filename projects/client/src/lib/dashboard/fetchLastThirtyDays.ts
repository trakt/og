import { api } from '../api/api.ts';
import { fetchRecentHistory } from '../users/fetchRecentHistory.ts';
import { fetchWatchedGenres } from '../users/profile/fetchWatchedGenres.ts';
import type { LastThirtyDays } from './LastThirtyDays.ts';
import { toLastThirtyDays } from './toLastThirtyDays.ts';

type FetchLastThirtyDaysParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  /** The viewer's slug, for the history links. */
  slug: string;
  timeZone: string;
  now?: Date;
};

/**
 * The viewer's Last 30 Days. OG's minutes-per-day chart came from a web route with no API twin, so it's
 * built from the plays of the profile's 30-day history; the genres are `/users/me/watched/genres/30`. A history page
 * that fails fails the panel, since the totals would be short; the genres alone just go missing.
 */
export async function fetchLastThirtyDays(
  { fetch, token, slug, timeZone, now = new Date() }: FetchLastThirtyDaysParams,
): Promise<LastThirtyDays> {
  const [recent, genres] = await Promise.all([
    fetchRecentHistory({ client: api({ fetch, token }), id: 'me', now }),
    fetchWatchedGenres({ fetch, token, id: 'me', days: 30 }),
  ]);
  if (!recent.complete) throw new Error('The last 30 days of history did not load');

  return toLastThirtyDays({ ...recent, genres, slug, now, timeZone });
}
