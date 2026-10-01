import { describe, expect, it } from 'vitest';
import { collectionMetadataLabel } from './collectionMetadataLabel.ts';

describe('collectionMetadataLabel', () => {
  it('should display OG format and audio labels', () => {
    expect(
      collectionMetadataLabel({
        media_type: 'bluray',
        resolution: 'hd_1080p',
        audio: 'dolby_atmos',
        audio_channels: '7.1',
        hdr: 'hdr10',
        '3d': true,
      }),
    ).toBe('Blu-ray · 1080p · HDR10 · 3D · Dolby TrueHD Atmos 7.1');
  });
  it('should omit unset fields, unknown enums and false 3D', () => {
    expect(collectionMetadataLabel(undefined)).toBe('');
    expect(collectionMetadataLabel({ media_type: null, resolution: 'future_format', '3d': false })).toBe('');
    expect(collectionMetadataLabel({ audio_channels: '2.0' })).toBe('2.0');
  });
});
