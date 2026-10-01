import type { ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toShowcaseSlide } from './toShowcaseSlide.ts';

const NOW = new Date('2026-09-30T12:00:00Z');
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;

const show = {
  title: 'Dexter: Resurrection',
  year: 2025,
  ids: { trakt: 249647, slug: 'dexter-resurrection' },
  first_aired: '2025-07-14T00:00:00.000Z',
  airs: { day: 'Sunday', time: '20:00', timezone: 'America/New_York' },
  network: 'Paramount+ with Showtime',
  country: 'us',
  runtime: 50,
  aired_episodes: 10,
  rating: 8.7,
  genres: ['crime', 'science-fiction'],
  overview: '  Dexter Morgan awakens from a coma.  ',
  images: {
    poster: ['media.trakt.tv/images/shows/000/249/647/posters/medium/4ae03d04d0.jpg.webp'],
    fanart: ['media.trakt.tv/images/shows/000/249/647/fanarts/medium/6c5e5d53a7.jpg.webp'],
  },
} as ShowResponse;

const slide = (overrides: Partial<ShowResponse>, options: { signedIn?: boolean; hour24?: boolean } = {}) =>
  toShowcaseSlide({
    show: { ...show, ...overrides },
    now: NOW,
    datePreferences: { ...datePreferences, hour24: options.hour24 ?? false },
    signedIn: options.signedIn ?? false,
  });

describe('mapper: toShowcaseSlide', () => {
  it('should link the show and use the full-size fanart', () => {
    expect(slide({})).toMatchObject({
      type: 'show',
      id: 249647,
      href: '/shows/dexter-resurrection',
      fullTitle: 'Dexter: Resurrection (2025)',
      poster: 'https://media.trakt.tv/images/shows/000/249/647/posters/thumb/4ae03d04d0.jpg.webp',
      fanart: 'https://media.trakt.tv/images/shows/000/249/647/fanarts/full/6c5e5d53a7.jpg.webp',
      released: true,
      rating: 8.7,
      airedEpisodes: 10,
    });
  });

  describe('for the premiere lines', () => {
    it("should read the day and time in the show's time zone when signed out", () => {
      expect(slide({})).toMatchObject({
        airs: 'Sundays at 8:00 PM on Paramount+ with Showtime',
        premiere: 'July 13, 2025 • United States • 50m',
      });
    });

    it("should read them in the viewer's time zone and clock when signed in", () => {
      expect(slide({}, { signedIn: true, hour24: true })).toMatchObject({
        airs: 'Mondays at 00:00 on Paramount+ with Showtime',
        premiere: 'July 14, 2025 • United States • 50m',
      });
    });

    it('should leave out a missing network, country or runtime', () => {
      expect(slide({ network: null, country: null, runtime: null })).toMatchObject({
        airs: 'Sundays at 8:00 PM',
        premiere: 'July 13, 2025',
      });
    });

    it('should keep a zero runtime, as API did', () => {
      expect(slide({ runtime: 0 }).premiere).toBe('July 13, 2025 • United States • 0m');
    });

    it('should leave out both lines without a premiere', () => {
      const unaired = slide({ first_aired: null });
      expect(unaired.airs).toBeUndefined();
      expect(unaired.premiere).toBeUndefined();
      expect(unaired.released).toBe(false);
    });
  });

  it('should humanize the genres like API', () => {
    expect(slide({}).genres).toBe('Crime, Science fiction');
    expect(slide({ genres: [] }).genres).toBeUndefined();
  });

  it('should trim the overview and leave out an empty one', () => {
    expect(slide({}).overview).toBe('Dexter Morgan awakens from a coma.');
    expect(slide({ overview: ' ' }).overview).toBeUndefined();
  });
});
