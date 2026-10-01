import { z } from 'zod/v4';

const term = z.object({
  query: z.string().trim().min(1),
  type: z.string().nullish(),
  created_at: z.number().optional(),
});

/** API's query history, not the worker's unrelated by-id trending response. */
export const recentSearchesSchema = z.object({ user: z.array(term), global: z.array(term) });
