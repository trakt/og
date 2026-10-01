import { z } from 'zod/v4';

const media = z.object({
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  title: z.string(),
  year: z.number().nullish(),
  runtime: z.number().nullish(),
  rating: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  images: z.object({ poster: z.array(z.string()).nullish() }).nullish(),
});

const row = { plays: z.number(), last_watched_at: z.string() };

/**
 * `/users/:id/watched/{shows,movies}?extended=full`. `@trakt/api` 0.6.0 types the movies route without a query, so
 * og can't page it through the typed client, and reads both lists raw.
 */
export const watchedItemsSchema = z.array(z.union([
  z.object({ ...row, show: media }),
  z.object({ ...row, movie: media }),
]));

export type WatchedItemRow = z.infer<typeof watchedItemsSchema>[number];
