import type { CollectedItem } from './CollectedItem.ts';

export function collectedDetails(item: CollectedItem | undefined) {
  return {
    collectedAt: typeof item === 'string' ? item : item?.at,
    collectionMetadata: typeof item === 'string' ? undefined : item?.metadata,
  };
}
