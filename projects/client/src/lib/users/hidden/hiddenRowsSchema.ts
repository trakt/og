import { z } from 'zod/v4';
const image = z.union([
  z.string(),
  z.array(z.string()),
  z.object({ full: z.string().nullish(), medium: z.string().nullish(), thumb: z.string().nullish() }),
]);
const media = z.object({
  ids: z.object({ trakt: z.number(), slug: z.string().nullish() }),
  title: z.string().nullish(),
  number: z.number().nullish(),
  images: z.object({ poster: image.nullish() }).nullish(),
});
/** Hidden reads are API. Users may have a slug but no numeric id. */
export const hiddenRowsSchema = z.array(z.object({
  hidden_at: z.iso.datetime({ offset: true }),
  type: z.enum(['movie', 'show', 'season', 'user']),
  movie: media.nullish(),
  show: media.nullish(),
  season: media.nullish(),
  user: z.object({
    username: z.string(),
    name: z.string().nullish(),
    ids: z.object({ slug: z.string(), trakt: z.number().nullish() }),
    images: z.object({ avatar: image.nullish() }).nullish(),
  }).nullish(),
}));
