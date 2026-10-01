import { api } from '../api/api.ts';
import { mediaStatsSchema } from '../stats/mediaStatsSchema.ts';
import type { ItemStatsTarget } from './ItemStatsTarget.ts';

/** No viewer token. Validate API responses with the shared stats schema. */
export async function fetchItemStats(target: ItemStatsTarget) {
  const client = api();
  const params = { id: `${target.show}`, season: target.season };
  const response = target.episode === undefined
    ? await client.shows.season.stats({ params })
    : await client.shows.episode.stats({ params: { ...params, episode: target.episode } });
  if (response.status !== 200) return null;
  // The small count schema also guards malformed native bodies, without guessing missing counts.
  const parsed = mediaStatsSchema.safeParse(response.body);
  return parsed.success ? parsed.data : null;
}
