import { z } from 'zod/v4';

const media = z.object({ ids: z.object({ trakt: z.number().int().positive() }) });
// The shortened /sync/favorites path has no @trakt/api contract. Both native and proxied rows carry list-item ids.
export const favoriteRowsSchema = z.array(z.discriminatedUnion('type', [
  z.object({
    type: z.literal('movie'),
    id: z.number().int().positive(),
    listed_at: z.iso.datetime().nullish(),
    notes: z.string().nullish(),
    movie: media,
  }),
  z.object({
    type: z.literal('show'),
    id: z.number().int().positive(),
    listed_at: z.iso.datetime().nullish(),
    notes: z.string().nullish(),
    show: media,
  }),
]));
