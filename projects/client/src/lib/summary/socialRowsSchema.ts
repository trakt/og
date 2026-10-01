// See the FIXME in `src/lib/users/notes/noteRowsSchema.ts`: og has one zod, and this is its v4 API.
import { z } from 'zod/v4';

const user = z.object({
  username: z.string(),
  name: z.string().nullish(),
  private: z.boolean().nullish(),
  deleted: z.boolean().nullish(),
  ids: z.object({ slug: z.string().nullish() }),
  images: z.object({ avatar: z.object({ full: z.string().nullish() }).nullish() }).nullish(),
});

/**
 * `/movies/:id/social` and `/shows/:id/social` (native, no `@trakt/api` contract): the followed members who watched or
 * watchlisted the item. The rating only comes inside `watched`.
 */
export const socialRowsSchema = z.array(z.object({
  user,
  watched: z.object({
    plays: z.number(),
    rating: z.object({ rating: z.number() }).nullish(),
  }).nullish(),
}));
