// FIXME(zod-4): see noteRowsSchema.ts. og uses the zod @trakt/api depends on, through its `zod/v4` API.
import { z } from 'zod/v4';

const media = z.object({
  title: z.string().nullish(),
  number: z.number().nullish(),
  images: z.object({ poster: z.array(z.string()).nullish() }).nullish(),
});

/**
 * The first items of a watchlist or favorites (`/users/:id/{watchlist,favorites}/:type/rank/asc`), for the row's
 * posters. `@trakt/api` types these as movies and shows only, and the watchlist also holds seasons and episodes.
 */
export const listItemsSchema = z.array(z.object({
  type: z.enum(['movie', 'show', 'season', 'episode']),
  movie: media.nullish(),
  show: media.nullish(),
  season: media.nullish(),
  episode: media.nullish(),
}));
