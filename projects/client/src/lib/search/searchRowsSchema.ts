import { z } from 'zod/v4';

const ids = z.object({ trakt: z.number(), slug: z.string().nullish() });
const art = z.array(z.string()).nullish();
const media = z.object({
  ids,
  title: z.string(),
  year: z.number().nullish(),
  rating: z.number().nullish(),
  runtime: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  first_aired: z.string().nullish(),
  released: z.string().nullish(),
  airs: z.object({ timezone: z.string().nullish() }).nullish(),
  // Every kind of art the search image type can pick (toSearchCard.ts).
  images: z.object({ poster: art, thumb: art, fanart: art, logo: art, banner: art }).nullish(),
});

// Parse at the loader boundary, including API bodies, before the pure mappers see them.
// Only the fields used by the search view models are retained.
export const searchRowsSchema = z.array(z.object({
  type: z.enum(['movie', 'show', 'episode', 'person', 'list']),
  movie: media.nullish(),
  show: media.nullish(),
  episode: z.object({
    ids,
    title: z.string().nullish(),
    season: z.number(),
    number: z.number(),
    first_aired: z.string().nullish(),
    episode_type: z.string().nullish(),
    rating: z.number().nullish(),
    runtime: z.number().nullish(),
    images: z.object({ screenshot: art }).nullish(),
  }).nullish(),
  person: z.object({
    ids,
    name: z.string(),
    images: z.object({ headshot: z.array(z.string()).nullish() }).nullish(),
  }).nullish(),
  list: z.object({
    ids,
    name: z.string(),
    type: z.string().nullish(),
    allow_comments: z.boolean().nullish(),
    item_count: z.number(),
    likes: z.number(),
    comment_count: z.number().nullish(),
    description: z.string().nullish(),
    images: z.object({ posters: z.array(z.string()).nullish() }).nullish(),
    user: z.object({
      username: z.string(),
      name: z.string().nullish(),
      ids: z.object({ slug: z.string().nullish() }),
      images: z.object({ avatar: z.object({ full: z.string().nullish() }).nullish() }).nullish(),
    }),
  }).nullish(),
}));
