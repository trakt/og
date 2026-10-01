// FIXME(zod-4): og has one zod, the one @trakt/api depends on. See `src/lib/users/notes/noteRowsSchema.ts`.
import { z } from 'zod/v4';

/**
 * A list row from `/:type/:id/lists/:type/:sort` or `/:type/:id/listed`, as far as `toSummaryList` reads it.
 * @trakt/api 0.6.0's `listResponseSchema` rejects real rows, so the parsed
 * reads use this instead.
 */
export const summaryListSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  privacy: z.string(),
  type: z.string(),
  allow_comments: z.boolean(),
  item_count: z.number(),
  comment_count: z.number(),
  likes: z.number(),
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  user: z.object({
    username: z.string(),
    name: z.string().nullish(),
    ids: z.object({ slug: z.string().nullish() }),
    images: z.object({ avatar: z.object({ full: z.string() }) }).nullish(),
  }),
  images: z.object({ posters: z.array(z.string()) }).nullish(),
});
