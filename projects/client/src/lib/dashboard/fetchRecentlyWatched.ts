import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { historyRowsSchema } from '../users/history/historyRowsSchema.ts';
import { type RecentPlay, toRecentPlay } from './toRecentPlay.ts';

type FetchRecentlyWatchedParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  datePreferences: DatePreferences;
};

/** OG's dashboard shows up to three rows of three. */
const LIMIT = 9;

/**
 * The viewer's last nine plays, newest first, from `/sync/history`, which always answers for the token's owner.
 * Read raw, with the history page's schema, since that is where the fanart cards' fields are.
 */
export async function fetchRecentlyWatched(
  { fetch, token, datePreferences }: FetchRecentlyWatchedParams,
): Promise<readonly RecentPlay[]> {
  const response = await rawApiFetch({ fetch, token, path: `/sync/history?limit=${LIMIT}&extended=full,images` });
  if (response.status !== 200) throw new Error(`Recently Watched failed with ${response.status}`);

  const rows = historyRowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) throw new Error('Recently Watched returned an invalid history');

  return rows.data.map((row) => toRecentPlay(row, datePreferences));
}
