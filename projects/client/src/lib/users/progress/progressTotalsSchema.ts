import { z } from 'zod/v4';

/** The summary strip's read of every progress page: only the counts, since it shows nothing else. */
export const progressTotalsSchema = z.array(z.object({
  progress: z.object({
    aired: z.number(),
    completed: z.number(),
    stats: z.object({ minutes_left: z.number() }).nullish(),
  }),
}));
