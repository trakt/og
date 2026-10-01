import { z } from 'zod/v4';
import { appNotificationsSchema } from './appNotificationsSchema.ts';

/**
 * The email notifications in `sharing.email`, which the API reads but can't write. OG checks one the
 * viewer never saved, except new followers.
 */
export const emailNotificationsSchema = z.object({
  ...appNotificationsSchema.shape,
  new_follower: z.boolean().nullish().transform((value) => value ?? false),
  streaming_optimizations: z.boolean().nullish().transform((value) => value ?? true),
});
