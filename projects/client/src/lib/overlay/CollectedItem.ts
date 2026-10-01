import type { CollectionMetadata } from '../components/collection/CollectionMetadata.ts';

/** Date strings from older caches remain readable until the versioned collection activity refetches them. */
export type CollectedItem = string | Readonly<{ at: string; id?: number; metadata?: CollectionMetadata }>;
