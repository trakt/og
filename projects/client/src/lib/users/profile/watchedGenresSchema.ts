import { z } from 'zod/v4';

const counts = z.object({ play_count: z.number(), ids: z.array(z.number()) });

/**
 * `/users/:id/watched/genres`, which the worker proxies to API.
 * `@trakt/api` has no contract for it. Rows come most played first.
 */
export const watchedGenresSchema = z.array(z.object({
  play_count: z.number(),
  genre: z.object({ slug: z.string(), name: z.string() }),
  percentage: z.number(),
  percentage_row: z.number(),
  movies: counts,
  shows: counts,
  episodes: counts,
}));

export type WatchedGenreRow = z.infer<typeof watchedGenresSchema>[number];
