import { describe, expect, it } from 'vitest';
import type { CalendarItem } from './calendarDays.ts';
import { toCalendarImage } from './toCalendarImage.ts';
const item = {
  type: 'episode',
  at: '2026-09-30T01:00:00Z',
  show: {
    title: 'Show',
    ids: { trakt: 1, slug: 'show' },
    images: {
      fanart: ['example.test/fanarts/medium/a.jpg'],
      logo: ['example.test/logos/medium/a.png'],
      poster: ['example.test/posters/medium/a.jpg'],
      banner: ['example.test/banners/medium/a.jpg'],
      thumb: ['example.test/thumbs/medium/a.jpg'],
    },
  },
  episode: {
    season: 1,
    number: 1,
    ids: { trakt: 2 },
    images: { screenshot: ['example.test/screenshots/medium/a.jpg'] },
  },
} as Extract<CalendarItem, { type: 'episode' }>;

describe('toCalendarImage', () => {
  it('should choose the image and shape for every setting', () => {
    expect(toCalendarImage(item, 'logo')).toMatchObject({
      image: 'https://example.test/fanarts/thumb/a.jpg',
      logo: 'https://example.test/logos/medium/a.png',
    });
    expect(toCalendarImage(item, 'fanart').logo).toBeUndefined();
    expect(toCalendarImage(item, 'screenshot').image).toBe('https://example.test/screenshots/thumb/a.jpg');
    expect(toCalendarImage(item, 'thumb').image).toBe('https://example.test/thumbs/medium/a.jpg');
    expect(toCalendarImage(item, 'banner')).toMatchObject({
      variant: 'banner',
      hideTitle: false,
      image: 'https://example.test/banners/medium/a.jpg',
    });
    expect(toCalendarImage(item, 'poster')).toMatchObject({
      variant: 'poster',
      hideTitle: false,
      image: 'https://example.test/posters/thumb/a.jpg',
    });
    expect(toCalendarImage(item, 'none').image).toBeUndefined();
  });
  it('should fall back from an absent thumb to the screenshot and retain titles when artwork is absent', () => {
    const missing = { ...item, show: { ...item.show, images: {} } } as Extract<CalendarItem, { type: 'episode' }>;
    expect(toCalendarImage(missing, 'thumb').image).toBe('https://example.test/screenshots/medium/a.jpg');
    expect(toCalendarImage(missing, 'thumb').hideSmallTitle).toBe(false);
    expect(toCalendarImage(missing, 'poster').hideTitle).toBe(false);
    expect(toCalendarImage(missing, 'logo').logoMode).toBe(true);
    expect(toCalendarImage(missing, 'thumb').worded).toBe(true);
  });
});
