import { z } from 'zod/v4';

export const pickerCatalogSchema = z.array(z.object({
  id: z.number(),
  name: z.string(),
  count: z.number(),
  display_order: z.number(),
  type: z.enum(['standard', 'collaborative']),
  owner_id: z.number(),
}));
