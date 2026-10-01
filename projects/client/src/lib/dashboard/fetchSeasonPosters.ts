import { api } from '../api/api.ts';
import { imageUrl } from '../utils/imageUrl.ts';

type FetchSeasonPostersParams = {
  fetch: typeof globalThis.fetch;
  /** Each episode's show and season. */
  episodes: readonly { readonly showId: number; readonly season: number }[];
};

export type SeasonPoster = (showId: number, season: number) => string | undefined;

const key = (showId: number, season: number) => `${showId}-${season}`;

/**
 * The season posters for OG's "Season" poster setting (`item_poster` with `use_season`): one public, cacheable
 * `/shows/:id/seasons?extended=images` per show, which also covers specials without a season 0 path param. A show that
 * fails, or a season without a poster, is left out, so its card keeps the show poster.
 */
export async function fetchSeasonPosters(
  { fetch, episodes }: FetchSeasonPostersParams,
): Promise<SeasonPoster> {
  const client = api({ fetch });
  const showIds = [...new Set(episodes.map(({ showId }) => showId))];
  const perShow = await Promise.all(showIds.map(async (showId) => {
    const response = await client.shows.seasons({ params: { id: String(showId) }, query: { extended: 'images' } })
      .catch(() => null);
    if (response?.status !== 200) return [];

    return response.body.flatMap((season): [string, string][] => {
      const poster = imageUrl(season.images?.poster?.at(0), 'thumb');
      return poster ? [[key(showId, season.number), poster]] : [];
    });
  }));

  const posters = new Map(perShow.flat());
  return (showId, season) => posters.get(key(showId, season));
}
