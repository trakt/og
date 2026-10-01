import type { CollectionMetadata } from './CollectionMetadata.ts';
import { collectionFields } from './collectionFields.ts';

export function collectionMetadataLabel(metadata: CollectionMetadata | undefined): string {
  if (!metadata) return '';
  const label = (key: 'media_type' | 'resolution' | 'hdr' | 'audio') =>
    collectionFields.find((field) => field.key === key)?.options.find(([value]) => value === metadata[key])?.at(1);
  const audio = [label('audio'), metadata.audio_channels].filter(Boolean).join(' ');
  return [label('media_type'), label('resolution'), label('hdr'), metadata['3d'] ? '3D' : null, audio].filter(Boolean)
    .join(' · ');
}
