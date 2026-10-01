import { describe, expect, it } from 'vitest';
import { toSubpageMedia } from './toSubpageMedia.ts';

const show = {
  ids: { trakt: 1388, slug: 'breaking-bad', imdb: 'tt0903747', tmdb: 1396, tvdb: 81189 },
  title: 'Breaking Bad',
  year: 2008,
  homepage: 'https://www.amc.com/shows/breaking-bad',
  aired_episodes: 62,
  images: {
    fanart: ['media.trakt.tv/images/shows/000/001/388/fanarts/medium/a.jpg.webp'],
    poster: ['media.trakt.tv/images/shows/000/001/388/posters/medium/b.jpg.webp'],
  },
  social_ids: { twitter: 'BreakingBad', wikipedia: null },
};

describe('toSubpageMedia', () => {
  describe('for movies', () => {
    const body = {
      type: 'movie',
      movie: {
        ids: { trakt: 1, slug: 'fight-club-1999', imdb: 'tt0137523', tmdb: 550 },
        title: 'Fight Club',
        year: 1999,
        images: { fanart: ['media.trakt.tv/f/medium/a.jpg'], poster: ['media.trakt.tv/p/medium/b.jpg'] },
      },
    };

    it('should title the header and size the images like the summary', () => {
      expect(toSubpageMedia({ body })).toMatchObject({
        title: 'Fight Club',
        year: 1999,
        href: '/movies/fight-club-1999',
        parents: [],
        fanart: 'https://media.trakt.tv/f/full/a.jpg',
        poster: 'https://media.trakt.tv/p/medium/b.jpg',
        item: { type: 'movie', id: 1, title: 'Fight Club (1999)' },
        watchNow: { title: 'Fight Club', year: 1999 },
        ratingTarget: { type: 'movie', id: 1, title: 'Fight Club (1999)' },
      });
    });

    it('should link out like the movie summary, with the JustWatch link when there is one', () => {
      const links = toSubpageMedia({ body, justwatch: 'https://www.justwatch.com/us/movie/fight-club' })?.links;
      expect(links?.map(({ label }) => label)).toEqual(['IMDB', 'TMDB', 'Fanart.tv', 'JustWatch', 'Wikipedia']);
      expect(links?.at(0)?.href).toBe('https://www.imdb.com/title/tt0137523');
    });
  });

  describe('for shows', () => {
    it('should use the show and its links', () => {
      const media = toSubpageMedia({ body: { type: 'show', show } });
      expect(media).toMatchObject({ title: 'Breaking Bad', year: 2008, href: '/shows/breaking-bad', parents: [] });
      expect(media?.links.map(({ label }) => label)).toEqual([
        'Official Site',
        'IMDB',
        'TMDB',
        'TVDB',
        'Fanart.tv',
        'Wikipedia',
        'Twitter',
      ]);
    });
  });

  describe('for seasons', () => {
    const season = {
      ids: { trakt: 3950 },
      number: 1,
      first_aired: '2008-01-21T02:00:00.000Z',
      images: { poster: ['media.trakt.tv/s/medium/c.jpg'] },
    };

    it('should put the show above the season and fall back to the show fanart', () => {
      expect(toSubpageMedia({ body: { type: 'season', season, show } })).toMatchObject({
        title: 'Season 1',
        year: 2008,
        href: '/shows/breaking-bad/seasons/1',
        parents: [{ title: 'Breaking Bad', href: '/shows/breaking-bad' }],
        fanart: 'https://media.trakt.tv/images/shows/000/001/388/fanarts/full/a.jpg.webp',
        poster: 'https://media.trakt.tv/s/medium/c.jpg',
        item: { type: 'season', title: 'Breaking Bad Season 1' },
        watchNow: { title: 'Breaking Bad', year: 2008 },
      });
    });

    it('should call season 0 Specials and use the show poster when the season has none', () => {
      const media = toSubpageMedia({ body: { type: 'season', season: { ...season, number: 0, images: null }, show } });
      expect(media).toMatchObject({
        title: 'Specials',
        poster: 'https://media.trakt.tv/images/shows/000/001/388/posters/medium/b.jpg.webp',
      });
      expect(media?.links.at(0)?.href).toBe('https://www.imdb.com/title/tt0903747/episodes?season=0');
    });
  });

  describe('for episodes', () => {
    const episode = {
      ids: { trakt: 73482, imdb: 'tt0959621' },
      season: 1,
      number: 1,
      title: 'Pilot',
      first_aired: '2008-01-21T02:00:00.000Z',
      images: { screenshot: ['media.trakt.tv/e/medium/d.jpg'] },
    };

    it('should title it with its number, link the show and season, and use its screenshot', () => {
      expect(toSubpageMedia({ body: { type: 'episode', episode, show } })).toMatchObject({
        title: '1x01 Pilot',
        year: 2008,
        href: '/shows/breaking-bad/seasons/1/episodes/1',
        parents: [
          { title: 'Breaking Bad', href: '/shows/breaking-bad' },
          { title: 'Season 1', href: '/shows/breaking-bad/seasons/1' },
        ],
        fanart: 'https://media.trakt.tv/e/full/d.jpg',
        poster: 'https://media.trakt.tv/images/shows/000/001/388/posters/medium/b.jpg.webp',
        item: { type: 'episode', title: 'Breaking Bad 1x01 "Pilot"' },
      });
    });

    it('should number specials and link TMDB to the episode', () => {
      const media = toSubpageMedia({ body: { type: 'episode', episode: { ...episode, season: 0, number: 3 }, show } });
      expect(media?.title).toBe('Special 3 Pilot');
      expect(media?.links.map(({ href }) => href)).toContain('https://www.themoviedb.org/tv/1396/season/0/episode/3');
    });
  });

  describe('for lists', () => {
    it("should link the owner's list and leave out Watch Now and the links", () => {
      const list = { ids: { trakt: 7, slug: 'mcu' }, name: 'MCU', user: { ids: { slug: 'donxy' } } };
      expect(toSubpageMedia({ body: { type: 'list', list } })).toEqual({
        item: { type: 'list', id: 7, title: 'MCU' },
        title: 'MCU',
        href: '/users/donxy/lists/mcu',
        parents: [],
        links: [],
      });
    });
  });

  it('should be undefined when the item is gone', () => {
    expect(toSubpageMedia({ body: { type: 'list' } })).toBeUndefined();
    expect(toSubpageMedia({ body: { type: 'episode', episode: null, show } })).toBeUndefined();
    expect(toSubpageMedia({ body: { type: 'person' } })).toBeUndefined();
  });
});
