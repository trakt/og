import { z } from 'zod/v4';
import { profileResponseSchema } from '../users/profileResponseSchema.ts';

/** API incoming requests, including the id the actions issue will need. */
export const followRequestsSchema = z.array(z.object({
  id: z.number().int(),
  requested_at: z.iso.datetime(),
  user: profileResponseSchema,
}));
