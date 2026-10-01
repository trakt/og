import type { z } from 'zod/v4';
import type { searchRowsSchema } from './searchRowsSchema.ts';

export type SearchHit = z.infer<typeof searchRowsSchema>[number];
