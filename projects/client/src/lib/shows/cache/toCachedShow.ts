import type { z } from 'zod/v4';
import type { CachedShow } from './CachedShow.ts';
import type { cachedShowSchema } from './cachedShowSchema.ts';

/** A parsed show as its cache record. It's complete only when the response carried images. */
export function toCachedShow(show: z.infer<typeof cachedShowSchema>, fetchedAt: number): CachedShow {
  return {
    id: show.ids.trakt,
    slug: show.ids.slug,
    title: show.title,
    year: show.year ?? undefined,
    status: show.status ?? undefined,
    genres: show.genres ?? [],
    runtime: show.runtime ?? undefined,
    totalRuntime: show.total_runtime ?? undefined,
    rating: show.rating ?? undefined,
    votes: show.votes ?? undefined,
    airedEpisodes: show.aired_episodes ?? undefined,
    firstAired: show.first_aired ?? undefined,
    lastAired: show.last_aired ?? undefined,
    poster: show.images?.poster?.at(0),
    fanart: show.images?.fanart?.at(0),
    fetchedAt,
    complete: Boolean(show.images),
  };
}
