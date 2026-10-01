import { describe, expect, it } from 'vitest';
import { toSearchImageType } from './toSearchImageType.ts';

const settings = (imageType: unknown) => ({ browsing: { search: { image_type: imageType } } });

describe('toSearchImageType', () => {
  it.each(['poster', 'thumb', 'screenshot', 'fanart', 'logo', 'banner'])('should honor %s', (imageType) => {
    expect(toSearchImageType({ settings: settings(imageType), slug: '' })).toBe(imageType);
    expect(toSearchImageType({ settings: settings(imageType), slug: 'episodes' })).toBe(imageType);
  });

  it('should default to posters signed out, unset or unknown', () => {
    expect(toSearchImageType({ settings: null, slug: '' })).toBe('poster');
    expect(toSearchImageType({ settings: { browsing: null }, slug: 'shows' })).toBe('poster');
    expect(toSearchImageType({ settings: settings(null), slug: 'movies' })).toBe('poster');
    expect(toSearchImageType({ settings: settings('none'), slug: 'movies' })).toBe('poster');
  });

  it('should keep posters on the People tab', () => {
    expect(toSearchImageType({ settings: settings('banner'), slug: 'people' })).toBe('poster');
  });
});
