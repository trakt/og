import { z } from 'zod/v4';
import { images } from '../../users/history/historyRowsSchema.ts';

/**
 * A show object with `extended=full`, with or without `images`, as `/shows/:id`, `/users/:id/watched/shows` and
 * `/users/:id/watchlist/shows` return it. Only the fields `toCachedShow` keeps.
 */
export const cachedShowSchema = z.object({
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  title: z.string(),
  year: z.number().nullish(),
  status: z.string().nullish(),
  genres: z.array(z.string()).nullish(),
  runtime: z.number().nullish(),
  total_runtime: z.number().nullish(),
  rating: z.number().nullish(),
  votes: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  first_aired: z.string().nullish(),
  last_aired: z.string().nullish(),
  images,
});
