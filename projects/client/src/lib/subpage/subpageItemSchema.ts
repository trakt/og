// FIXME(zod-4): og has one zod, the one @trakt/api depends on. See `src/lib/users/notes/noteRowsSchema.ts`.
import { z } from 'zod/v4';

const images = z.object({
  fanart: z.array(z.string()).nullish(),
  poster: z.array(z.string()).nullish(),
  screenshot: z.array(z.string()).nullish(),
}).nullish();
const ids = z.object({
  trakt: z.number(),
  slug: z.string().nullish(),
  imdb: z.string().nullish(),
  tmdb: z.number().nullish(),
  tvdb: z.number().nullish(),
});
const socialIds = z.object({
  twitter: z.string().nullish(),
  facebook: z.string().nullish(),
  instagram: z.string().nullish(),
  wikipedia: z.string().nullish(),
}).nullish();
const title = {
  ids: ids.extend({ slug: z.string() }),
  title: z.string(),
  year: z.number().nullish(),
  homepage: z.string().nullish(),
  images,
  social_ids: socialIds,
};

/**
 * `/comments/:id/item?extended=full,images`: the `type` and the media under that key, with the show beside a season
 * or an episode. The item is left out when it's gone, or when it's a list that isn't public. @trakt/api 0.6.0 types
 * this route as a bare media object, so og parses it here. The subpage loaders build the same shape from the typed
 * summaries.
 */
export const subpageItemSchema = z.object({
  type: z.string(),
  movie: z.object({ ...title, released: z.string().nullish() }).nullish(),
  show: z.object({ ...title, first_aired: z.string().nullish(), aired_episodes: z.number().nullish() }).nullish(),
  season: z.object({
    ids,
    number: z.number(),
    first_aired: z.string().nullish(),
    aired_episodes: z.number().nullish(),
    images,
  }).nullish(),
  episode: z.object({
    ids,
    episode_type: z.string().nullish(),
    season: z.number(),
    number: z.number(),
    title: z.string().nullish(),
    first_aired: z.string().nullish(),
    images,
  }).nullish(),
  list: z.object({
    ids: z.object({ trakt: z.number(), slug: z.string() }),
    name: z.string(),
    user: z.object({ ids: z.object({ slug: z.string().nullish() }) }).nullish(),
  }).nullish(),
});
