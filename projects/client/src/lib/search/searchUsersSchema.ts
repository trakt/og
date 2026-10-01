import { z } from 'zod/v4';
import { profileResponseSchema } from '../users/profileResponseSchema.ts';

/**
 * `/search/user` rows. `@trakt/api` has no `user` search type. Parsed here like any proxied body. With `extended=full,vip` each user carries the
 * profile fields, the avatar and the VIP cover.
 */
export const searchUsersSchema = z.array(z.object({ type: z.literal('user'), user: profileResponseSchema }));
