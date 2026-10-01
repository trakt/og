import { describe, expect, it } from 'vitest';
import { collectionBadges } from './collectionBadges.ts';

describe('collectionBadges', () => {
  it('should show a 4K Blu-ray as Ultra HD with its tags over the audio column', () => {
    expect(collectionBadges({
      media_type: 'bluray',
      resolution: 'uhd_4k',
      hdr: 'hdr10',
      audio: 'dolby_atmos',
      audio_channels: '7.1',
      '3d': null,
    })).toEqual({
      video: { logo: { name: 'bluray_ultrahd', label: 'Blu-ray' }, threeD: false, resolution: '4K', hdr: 'HDR10' },
      audio: { logo: { name: 'dolby_atmos', label: 'Dolby TrueHD Atmos' }, channels: '7.1' },
    });
  });

  it('should leave out an empty column, and everything when nothing is set', () => {
    expect(collectionBadges({ '3d': true })).toEqual({
      video: { logo: undefined, threeD: true, resolution: undefined, hdr: undefined },
    });
    expect(collectionBadges({ audio_channels: '2.0' })).toEqual({ audio: { logo: undefined, channels: '2.0' } });
    expect(collectionBadges({ '3d': false, media_type: null })).toBeUndefined();
    expect(collectionBadges(null)).toBeUndefined();
  });
});
