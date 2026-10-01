import { z } from 'zod/v4';

// API leaves out a toggle the viewer never saved, and already reads it as on.
const on = z.boolean().nullish().transform((value) => value ?? true);

/**
 * The Trakt Apps push notifications in `sharing.app`, the only notifications `PUT /users/settings`
 * writes.
 */
export const appNotificationsSchema = z.object({
  new_follower: on,
  comment_mention: on,
  comment_reply: on,
  comment_like: on,
  list_comment: on,
  list_like: on,
  pending_collaboration: on,
  weekly_digest: on,
  mir: on,
});
