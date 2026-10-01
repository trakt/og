import { episodeResponseSchema } from '@trakt/api';
import { z } from 'zod/v4';
import { contractSchema } from '../api/contractSchema.ts';

/** The seasons contract omits extended episodes. Keep their ids and numbers for navigation. */
export const episodeSeasonsSchema = z.array(z.object({
  number: z.number().int().nonnegative(),
  episodes: z.array(contractSchema(episodeResponseSchema)).nullish(),
}));
