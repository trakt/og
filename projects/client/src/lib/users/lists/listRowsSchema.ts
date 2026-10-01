// FIXME(zod-4): see noteRowsSchema.ts. og uses the zod @trakt/api depends on, through its `zod/v4` API.
import { z } from 'zod/v4';

const owner = z.object({
  username: z.string(),
  name: z.string().nullish(),
  ids: z.object({ slug: z.string().nullish() }),
  vip: z.boolean().nullish(),
  vip_ep: z.boolean().nullish(),
  director: z.boolean().nullish(),
  images: z.object({ avatar: z.object({ full: z.string().nullish() }).nullish() }).nullish(),
});

/**
 * Lists in the shape `/users/:id/lists/collaborations` answers with. It's proxied to API, so it's parsed here rather
 * than trusted to the `@trakt/api` contract.
 */
export const listRowsSchema = z.array(z.object({
  name: z.string(),
  description: z.string().nullish(),
  privacy: z.string(),
  type: z.string(),
  allow_comments: z.boolean().nullish(),
  updated_at: z.string(),
  item_count: z.number(),
  comment_count: z.number().nullish(),
  likes: z.number().nullish(),
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  user: owner,
  images: z.object({ posters: z.array(z.string()) }).nullish(),
}));
