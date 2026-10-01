import { z } from 'zod/v4';
import { profileResponseSchema } from '../users/profileResponseSchema.ts';

/** The proxied viewer profile also supplies the account age used by the greeting and notices. */
export const dashboardProfileSchema = profileResponseSchema.extend({ joined_at: z.iso.datetime() });
