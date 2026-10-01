import { describe, expect, it } from 'vitest';
import { syncItemSchema } from './syncItemSchema.ts';
import { syncItemsFixture } from './syncsFixture.ts';
import { toSyncItemTable } from './toSyncItemTable.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const sources = new Map([['netflix', { name: 'Netflix', color: '#e50914' }]]);
const table = (items: readonly unknown[], layout: 'younify' | 'plex') =>
  toSyncItemTable({ items: items.map((item) => syncItemSchema.parse(item)), layout, sources, datePreferences });

describe('toSyncItemTable', () => {
  describe('for Younify', () => {
    it("should use OG's columns, titled by the page's section", () => {
      const younify = table(syncItemsFixture.skipped, 'younify');
      expect(younify.section).toBe('History');
      expect(younify.headers).toEqual(['Watched At', 'Watch Link', 'Type', 'TMDB ID', 'Trakt Item', 'Progress']);
    });

    it('should mark what caused the skip in red', () => {
      const [unmatched, lowProgress] = table(syncItemsFixture.skipped, 'younify').rows;
      expect(unmatched?.slice(2, 5)).toEqual([
        { lines: [{ text: 'unknown' }], tone: 'bad' },
        { lines: [{ text: 'unknown' }], tone: 'bad' },
        { lines: [{ text: 'unknown' }], tone: 'bad' },
      ]);
      expect(unmatched?.at(5)).toEqual({ lines: [{ text: '100.0%' }], tone: 'good' });
      expect(lowProgress?.at(5)).toEqual({ lines: [{ text: '4.9%' }], tone: 'bad' });
    });

    it('should link the service, the TMDB lookup and the matched Trakt item', () => {
      const [episode] = table(syncItemsFixture.paused, 'younify').rows;
      expect(episode?.at(0)).toEqual({ lines: [{ text: 'Dec 30, 2025 3:12 AM' }] });
      expect(episode?.at(1)?.service).toEqual({
        name: 'Netflix',
        color: '#e50914',
        href: 'https://netflix.com/watch/80189692',
      });
      expect(episode?.at(3)?.lines).toEqual([
        { text: '1587112', href: '/search/tmdb?query=1587112&id_type=episode', newTab: true },
      ]);
      expect(episode?.at(4)?.lines).toEqual([
        { text: 'The Boys (2019)', href: '/shows/the-boys-2019' },
        { text: '1x03 Get Some', href: '/shows/the-boys-2019/seasons/1/episodes/3' },
      ]);
    });
  });

  describe('for Plex', () => {
    it("should use OG's columns and search for the stored titles", () => {
      const plex = table(syncItemsFixture.plexSkipped, 'plex');
      expect(plex.headers).toEqual(['Watched At', 'Type', 'TMDB ID', 'IMDB ID', 'Title', 'Trakt Item']);
      expect(plex.rows.at(0)?.at(4)?.lines).toEqual([
        { text: 'A Show Plex Knows', href: '/search/shows?query=A%20Show%20Plex%20Knows', newTab: true },
        {
          text: '2x04 An Unmatched Episode',
          href: '/search/episodes?query=A%20Show%20Plex%20Knows%202x04%20An%20Unmatched%20Episode',
          newTab: true,
        },
      ]);
      expect(plex.rows.at(1)?.at(3)?.lines.at(0)?.href).toBe('/search/imdb?query=tt0137523&id_type=movie');
      expect(plex.rows.at(1)?.at(5)?.lines).toEqual([{ text: 'Fight Club (1999)', href: '/movies/fight-club-1999' }]);
    });
  });

  it('should title a page that mixes history and ratings plainly', () => {
    const mixed = table([...syncItemsFixture.skipped, { kind: 'rating', type: 'movie', rated_at: null }], 'younify');
    expect(mixed.section).toBeNull();
    expect(mixed.headers.at(0)).toBe('Date');
  });
});
