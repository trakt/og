import type { SearchResultResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toSearchRow } from './toSearchRow.ts';

// Fixtures carry only the fields the mapper reads.
const hit = (value: object) => value as SearchResultResponse;

const breakingBad = {
  title: 'Breaking Bad',
  year: 2008,
  ids: { trakt: 1388, slug: 'breaking-bad' },
  genres: ['drama', 'science-fiction'],
  images: { poster: ['media.trakt.tv/images/shows/000/001/388/posters/medium/fa39b59954.jpg.webp'] },
};

describe('toSearchRow', () => {
  describe('for shows and movies', () => {
    it('should show the type, the year and the genres with dashes spaced out', () => {
      expect(toSearchRow(hit({ type: 'show', show: breakingBad }))).toEqual({
        key: 'show-1388',
        recent: { query: 'Breaking Bad', type: 'shows', id: 1388 },
        href: '/shows/breaking-bad',
        title: 'Breaking Bad',
        type: 'Show',
        tag: '2008',
        genres: 'drama, science fiction',
        poster: 'https://media.trakt.tv/images/shows/000/001/388/posters/thumb/fa39b59954.jpg.webp',
      });
    });

    it('should leave out a missing year, genres and poster', () => {
      const movie = { title: 'Hayde Bre', year: null, ids: { trakt: 1, slug: 'hayde-bre' }, genres: [], images: null };

      const row = toSearchRow(hit({ type: 'movie', movie }));

      expect(row).toMatchObject({ href: '/movies/hayde-bre', type: 'Movie' });
      expect([row?.tag, row?.genres, row?.poster]).toEqual([undefined, undefined, undefined]);
    });
  });

  describe('for episodes', () => {
    const episode = {
      title: 'Pilot',
      season: 1,
      number: 1,
      first_aired: '2008-01-21T12:00:00.000Z',
      ids: { trakt: 73482 },
    };

    it('should put the show above, season x episode in the title and the air date in the tag', () => {
      expect(toSearchRow(hit({ type: 'episode', episode, show: breakingBad }))).toMatchObject({
        recent: { query: 'Pilot', type: 'episodes', id: 73482 },
        href: '/shows/breaking-bad/seasons/1/episodes/1',
        topTitle: 'Breaking Bad',
        title: '1x01 Pilot',
        type: 'Episode',
        tag: 'Jan 21, 2008',
        genres: 'drama, science fiction',
      });
    });

    it("should date the episode in the viewer's time zone", () => {
      const lateUtc = { ...episode, first_aired: '2008-01-21T02:00:00.000Z' };
      const dates = { order: 'mdy', timeZone: 'America/New_York' } as const;

      expect(toSearchRow(hit({ type: 'episode', episode: lateUtc, show: breakingBad }), dates)?.tag).toBe(
        'Jan 20, 2008',
      );
    });

    it('should title a season 0 episode as a special', () => {
      const special = { ...episode, season: 0, number: 3 };

      expect(toSearchRow(hit({ type: 'episode', episode: special, show: breakingBad }))?.title).toBe('Special 3 Pilot');
    });
  });

  it('should use the headshot for people and skip the tag', () => {
    const person = {
      name: 'Bryan Cranston',
      ids: { trakt: 297737, slug: 'bryan-cranston' },
      images: { headshot: ['media.trakt.tv/images/people/000/297/737/headshots/medium/abc.jpg.webp'] },
    };

    const row = toSearchRow(hit({ type: 'person', person }));

    expect(row).toMatchObject({
      href: '/people/bryan-cranston',
      title: 'Bryan Cranston',
      type: 'Person',
      poster: 'https://media.trakt.tv/images/people/000/297/737/headshots/thumb/abc.jpg.webp',
    });
    expect(row?.tag).toBeUndefined();
  });

  it('should link lists by id and name official ones', () => {
    const list = { name: 'Best Mindfucks', type: 'official', ids: { trakt: 800238, slug: 'best-mindfucks' } };

    expect(toSearchRow(hit({ type: 'list', list }))).toMatchObject({
      href: '/lists/800238',
      title: 'Best Mindfucks',
      type: 'Official List',
    });
  });

  it('should return null when the named object is missing', () => {
    expect(toSearchRow(hit({ type: 'show', show: null }))).toBeNull();
  });
});
