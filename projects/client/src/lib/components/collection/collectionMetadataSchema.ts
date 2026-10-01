import { z } from 'zod/v4';

/** Metadata is optional, including Format and Resolution. */
export const collectionMetadataSchema = z.object({
  media_type: z.string().nullish(),
  resolution: z.string().nullish(),
  hdr: z.string().nullish(),
  audio: z.string().nullish(),
  audio_channels: z.string().nullish(),
  '3d': z.boolean().nullish(),
});
