import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { type WatchedGenreRow, watchedGenresSchema } from './watchedGenresSchema.ts';

type FetchWatchedGenresParams = {
  fetch: typeof fetch;
  token?: string | null;
  /** A user's slug, or `me` for the token's owner. */
  id: string;
  /** Only the last this many days. All time without it. */
  days?: number;
};

/**
 * `/users/:id/watched/genres(/:days)`, most played first. It's API and has no contract, so it's parsed here,
 * and anything but a good 200 is no genres: the charts it feeds hide without them.
 */
export async function fetchWatchedGenres(
  { fetch, token, id, days }: FetchWatchedGenresParams,
): Promise<readonly WatchedGenreRow[]> {
  const path = `/users/${encodeURIComponent(id)}/watched/genres${days ? `/${days}` : ''}`;
  const response = await rawApiFetch({ fetch, token, path });
  if (response.status !== 200) return [];
  const rows = watchedGenresSchema.safeParse(await response.json().catch(() => null));
  return rows.success ? rows.data : [];
}
