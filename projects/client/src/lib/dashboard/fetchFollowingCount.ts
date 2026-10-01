import type { api } from '../api/api.ts';

type FetchFollowingCountParams = {
  api: ReturnType<typeof api>;
};

/**
 * How many members the viewer follows, from `/users/me/stats` (`network.following`). The Social Feed skips its request
 * at zero and the recommendations name the count. Null when the stats don't load, so neither panel guesses.
 */
export async function fetchFollowingCount({ api }: FetchFollowingCountParams): Promise<number | null> {
  const response = await api.users.stats({ params: { id: 'me' } }).catch(() => null);
  return response?.status === 200 ? response.body.network.following : null;
}
