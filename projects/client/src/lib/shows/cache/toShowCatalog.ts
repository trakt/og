import { z } from 'zod/v4';
import { images } from '../../users/history/historyRowsSchema.ts';
import type { ShowCatalog } from './ShowCatalog.ts';

const seasonsSchema = z.array(z.object({
  number: z.number(),
  title: z.string().nullish(),
  episodes: z.array(z.object({
    ids: z.object({ trakt: z.number() }),
    season: z.number(),
    number: z.number(),
    number_abs: z.number().nullish(),
    title: z.string().nullish(),
    overview: z.string().nullish(),
    episode_type: z.string().nullish(),
    first_aired: z.string().nullish(),
    runtime: z.number().nullish(),
    rating: z.number().nullish(),
    images,
  })).nullish(),
}));

/**
 * `/shows/:id/seasons?extended=full,episodes` as a catalog, seasons and episodes in number order. Throws on a body
 * that isn't one.
 */
export function toShowCatalog({ id, body, fetchedAt }: { id: number; body: unknown; fetchedAt: number }): ShowCatalog {
  const seasons = seasonsSchema.parse(body).map((season) => ({
    number: season.number,
    title: season.title ?? undefined,
    episodes: (season.episodes ?? []).map((episode) => ({
      id: episode.ids.trakt,
      season: episode.season,
      number: episode.number,
      numberAbs: episode.number_abs ?? undefined,
      title: episode.title ?? undefined,
      overview: episode.overview ?? undefined,
      type: episode.episode_type ?? undefined,
      firstAired: episode.first_aired ?? undefined,
      runtime: episode.runtime ?? undefined,
      rating: episode.rating ?? undefined,
      screenshot: episode.images?.screenshot?.at(0),
    })).toSorted((a, b) => a.number - b.number),
  })).toSorted((a, b) => a.number - b.number);

  return { id, seasons, fetchedAt };
}
