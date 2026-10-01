import type { CollectionMetadata } from './CollectionMetadata.ts';
import { collectionFields } from './collectionFields.ts';

/** One logo on the poster overlay: a `logos` icon name and its readable label. */
export type CollectionLogo = { readonly name: string; readonly label: string };

/** OG's poster overlay: the video column over the audio column. */
export type CollectionBadges = {
  readonly video?: {
    readonly logo?: CollectionLogo;
    readonly threeD: boolean;
    readonly resolution?: string;
    readonly hdr?: string;
  };
  readonly audio?: { readonly logo?: CollectionLogo; readonly channels?: string };
};

type LabelledKey = 'media_type' | 'resolution' | 'hdr' | 'audio';

const label = (key: LabelledKey, value: string | null | undefined): string | undefined =>
  collectionFields.find((field) => field.key === key)?.options.find(([option]) => option === value)?.at(1);

const logo = (key: 'media_type' | 'audio', value: string | null | undefined, name = value) => {
  const text = label(key, value);
  return text && name ? { name, label: text } : undefined;
};

/** The overlay's columns, or undefined when nothing is set. A 4K Blu-ray shows the Ultra HD Blu-ray logo. */
export function collectionBadges(metadata: CollectionMetadata | null | undefined): CollectionBadges | undefined {
  if (!metadata) return undefined;
  const { media_type, resolution, hdr, audio, audio_channels } = metadata;
  const threeD = metadata['3d'] === true;
  const video = media_type || resolution || hdr || threeD
    ? {
      logo: logo(
        'media_type',
        media_type,
        media_type === 'bluray' && resolution === 'uhd_4k' ? 'bluray_ultrahd' : media_type,
      ),
      threeD,
      resolution: label('resolution', resolution),
      hdr: label('hdr', hdr),
    }
    : undefined;
  const sound = audio || audio_channels
    ? { logo: logo('audio', audio), channels: audio_channels ?? undefined }
    : undefined;
  return video || sound ? { ...(video && { video }), ...(sound && { audio: sound }) } : undefined;
}
