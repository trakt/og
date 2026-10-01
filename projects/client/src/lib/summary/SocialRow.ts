import type { z } from 'zod/v4';
import type { socialRowsSchema } from './socialRowsSchema.ts';

/** One followed member's row from `/social`. */
export type SocialRow = z.infer<typeof socialRowsSchema>[number];
