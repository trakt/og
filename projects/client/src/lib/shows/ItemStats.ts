import type { z } from 'zod/v4';
import type { mediaStatsSchema } from '../stats/mediaStatsSchema.ts';

export type ItemStats = z.infer<typeof mediaStatsSchema>;
