// FIXME(zod-4): og has one zod, the one @trakt/api depends on. See `src/lib/users/notes/noteRowsSchema.ts`.
import { z } from 'zod/v4';

// API leaves `ids.trakt` out for apps it doesn't list as official, and the worker and API both leave the name, VIP
// flags and avatar out for a private author. The card reads neither the author's trakt id nor their privacy.
const user = z.object({
  username: z.string(),
  private: z.boolean().nullish().transform((value) => value ?? false),
  deleted: z.boolean().nullish().transform((value) => value ?? false),
  name: z.string().nullish(),
  vip: z.boolean().nullish(),
  vip_ep: z.boolean().nullish(),
  director: z.boolean().nullish(),
  ids: z.object({ slug: z.string().nullish(), trakt: z.number().nullish().transform((value) => value ?? 0) }),
  images: z.object({ avatar: z.object({ full: z.string() }) }).nullish(),
});

/**
 * One comment as the comment card reads it, for routes whose rows `@trakt/api` doesn't type. The card never renders a GIF, so `gif` isn't read.
 */
export const commentSchema = z.object({
  id: z.number(),
  parent_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  comment: z.string(),
  spoiler: z.boolean(),
  review: z.boolean(),
  replies: z.number(),
  likes: z.number(),
  language: z.string().nullish(),
  user_rating: z.number().nullish(),
  user_stats: z.object({ rating: z.number().nullish(), play_count: z.number(), completed_count: z.number() }),
  user,
});
