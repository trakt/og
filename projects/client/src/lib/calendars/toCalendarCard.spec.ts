import { describe, expect, it } from 'vitest';
import { toCalendarCard } from './toCalendarCard.ts';
import type { CalendarItem } from './calendarDays.ts';

const images = {
  fanart: ['media.trakt.tv/images/shows/000/001/fanarts/medium/a.jpg.webp'],
  logo: ['media.trakt.tv/images/shows/000/001/logos/medium/b.png.webp'],
};

const episode = (fields: Record<string, unknown> = {}, show: Record<string, unknown> = {}) =>
  ({
    type: 'episode',
    at: '2026-09-29T21:00:00.000Z',
    show: { title: 'Shogun', ids: { trakt: 1, slug: 'shogun' }, network: 'FX', images, ...show },
    episode: {
      season: 3,
      number: 3,
      title: 'The Line of Beauty',
      episode_type: 'standard',
      ids: { trakt: 9 },
      ...fields,
    },
  }) as CalendarItem;

const UTC = { timeZone: 'UTC', hour24: false };

describe('toCalendarCard', () => {
  describe('for episodes', () => {
    it('should title the card like OG', () => {
      expect(toCalendarCard(episode(), UTC)).toMatchObject({
        key: 'episode-9',
        overlay: { type: 'episode', id: 9 },
        collectionContext: { show: 1, number: 3, episode: 3 },
        hideTarget: { type: 'show', id: 1, title: 'Shogun' },
        href: '/shows/shogun/seasons/3/episodes/3',
        number: '3x03',
        title: 'The Line of Beauty',
        smallTitle: { text: 'Shogun', href: '/shows/shogun' },
        image: 'https://media.trakt.tv/images/shows/000/001/fanarts/thumb/a.jpg.webp',
        logo: 'https://media.trakt.tv/images/shows/000/001/logos/medium/b.png.webp',
      });
    });

    it('should tag the UTC air time and the network', () => {
      expect(toCalendarCard(episode(), UTC).tags).toEqual([{ text: '9:00 pm' }, { text: 'FX', kind: 'generic' }]);
      expect(toCalendarCard({ ...episode(), at: '2026-09-29T09:05:00.000Z' }, UTC).tags?.at(0)).toEqual({
        text: '9:05 am',
      });
    });

    it("should use the viewer's zone and 24-hour clock", () => {
      const tags = toCalendarCard(episode(), { timeZone: 'America/New_York', hour24: true }).tags;
      expect(tags?.at(0)).toEqual({ text: '17:00' });
    });

    it('should label premieres and finales', () => {
      const label = (fields: Record<string, unknown>) => toCalendarCard(episode(fields), UTC).tags?.at(0);
      expect(label({ season: 1, number: 1 })).toEqual({ text: 'Series Premiere', kind: 'series-premiere' });
      expect(label({ number: 1 })).toEqual({ text: 'Season Premiere', kind: 'season-premiere' });
      expect(label({ episode_type: 'mid_season_finale' })).toEqual({
        text: 'Mid Season Finale',
        kind: 'mid-season-finale',
      });
      expect(label({ season: 0, number: 1 })).toEqual({ text: '9:00 pm' });
    });

    it('should number specials and anime like OG', () => {
      expect(toCalendarCard(episode({ season: 0, number: 2 }), UTC).number).toBe('Special 2');
      expect(toCalendarCard(episode({ number_abs: 669 }), UTC).number).toBe('3x03');
      expect(toCalendarCard(episode({ number_abs: 669 }, { genres: ['anime'] }), UTC).number).toBe('3x03 (669)');
    });
  });

  describe('for movies', () => {
    it('should title the card with the year', () => {
      const movie = {
        type: 'movie',
        at: '2026-09-30',
        movie: { title: 'Naza', year: 2026, ids: { trakt: 5, slug: 'naza-2026' }, images: { fanart: [], logo: [] } },
      } as unknown as CalendarItem;

      expect(toCalendarCard(movie, UTC)).toEqual({
        key: 'movie-5',
        overlay: { type: 'movie', id: 5 },
        episode: false,
        href: '/movies/naza-2026',
        title: 'Naza',
        year: 2026,
        image: undefined,
        logo: undefined,
        logoMode: true,
        worded: false,
        variant: 'fanart',
        hideTitle: false,
        hideSmallTitle: false,
        tagline: undefined,
        rating: undefined,
      });
    });
  });
});
