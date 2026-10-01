import type { z } from 'zod/v4';
import type { collectionMetadataSchema } from './collectionMetadataSchema.ts';

export type CollectionMetadata = z.infer<typeof collectionMetadataSchema>;
