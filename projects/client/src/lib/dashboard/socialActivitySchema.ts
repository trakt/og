import { z } from 'zod/v4';
import { episode, movie, show } from '../users/history/historyRowsSchema.ts';

// The member fields a Social Feed card reads. `name` is the worker's display name, blank when they never set one.
const member = z.object({
  username: z.string(),
  name: z.string().nullish(),
  deleted: z.boolean().nullish(),
  ids: z.object({ slug: z.string().nullish() }),
  images: z.object({ avatar: z.object({ full: z.string().nullish() }) }).nullish(),
});

const watch = { id: z.number(), activity_at: z.string(), action: z.literal('watch'), user: member };

/**
 * One watch from `/v3/users/me/following/activities?action=watch&extended=full,images`
 * `@trakt/api` has no contract
 * for the v3 feed, so each row is parsed here.
 */
export const socialActivitySchema = z.union([
  z.object({ ...watch, type: z.literal('movie'), movie }),
  z.object({ ...watch, type: z.literal('episode'), episode, show }),
]);

export type SocialActivity = z.infer<typeof socialActivitySchema>;
