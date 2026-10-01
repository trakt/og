import { describe, expect, it } from 'vitest';
import { recentCommentRowsSchema } from './recentCommentRowsSchema.ts';
import { toRecentComment } from './toRecentComment.ts';

const comment = {
  id: 7,
  parent_id: 0,
  created_at: '2026-09-30T12:00:00.000Z',
  updated_at: '2026-09-30T12:00:00.000Z',
  comment: 'Great.',
  spoiler: false,
  review: true,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 1, completed_count: 1 },
  user: { username: 'sean', private: false, deleted: false, ids: { slug: 'sean' } },
};
const fanart = (path: string) => ({ fanart: [`media.trakt.tv/images/${path}/fanarts/medium/f.jpg.webp`] });
const show = {
  ids: { trakt: 1, slug: 'the-boys-2019' },
  title: 'The Boys',
  year: 2019,
  aired_episodes: 32,
  genres: ['drama'],
  images: fanart('shows/1'),
};
const anime = { ...show, genres: ['anime'] };

const parse = (row: unknown) => {
  const [parsed] = recentCommentRowsSchema.parse([row]);
  if (!parsed) throw new Error('the row did not parse');
  return toRecentComment(parsed);
};

describe('toRecentComment', () => {
  describe('for movies and shows', () => {
    it('should title a movie with its year over its full-size fanart', () => {
      const entry = parse({
        type: 'movie',
        comment,
        movie: {
          ids: { trakt: 2, slug: 'big-hero-6-2014' },
          title: 'Big Hero 6',
          year: 2014,
          images: fanart('movies/2'),
        },
      });

      expect(entry).toMatchObject({
        href: '/movies/big-hero-6-2014',
        title: 'Big Hero 6',
        year: 2014,
        fanart: 'https://media.trakt.tv/images/movies/2/fanarts/full/f.jpg.webp',
        item: { type: 'movie', id: 2, title: 'Big Hero 6 (2014)' },
      });
      expect(entry?.subtitle).toBeUndefined();
    });

    it('should give a show its aired episodes for the watched state', () => {
      expect(parse({ type: 'show', comment, show })).toMatchObject({
        href: '/shows/the-boys-2019',
        item: { type: 'show', id: 1, airedEpisodes: 32 },
      });
    });
  });

  describe('for seasons and episodes', () => {
    it('should title a season with its show, the year it first aired and the show fanart', () => {
      const entry = parse({
        type: 'season',
        comment,
        show,
        season: { ids: { trakt: 3 }, number: 0, first_aired: '2020-12-31T23:00:00.000Z' },
      });

      expect(entry).toMatchObject({
        href: '/shows/the-boys-2019/seasons/0',
        title: 'The Boys',
        year: 2020,
        subtitle: { title: 'Specials' },
        fanart: 'https://media.trakt.tv/images/shows/1/fanarts/full/f.jpg.webp',
      });
    });

    it('should number an anime episode with its absolute number', () => {
      const entry = parse({
        type: 'episode',
        comment,
        show: anime,
        episode: { ids: { trakt: 4 }, season: 3, number: 3, number_abs: 28, title: ' Hunt ', first_aired: null },
      });

      expect(entry).toMatchObject({
        href: '/shows/the-boys-2019/seasons/3/episodes/3',
        subtitle: { number: '3x03 (28)', title: 'Hunt' },
        item: { type: 'episode', id: 4, show: 1, season: 3 },
      });
      expect(entry?.year).toBeUndefined();
    });
  });

  describe('for lists', () => {
    const list = { name: 'Marvel', ids: { trakt: 9, slug: 'marvel' }, user: { ids: { slug: 'donxy' } } };

    it("should link a personal list under its owner and leave its fanart to the list's items", () => {
      const entry = parse({ type: 'list', comment, list: { ...list, type: 'personal' } });

      expect(entry).toMatchObject({ href: '/users/donxy/lists/marvel', title: 'Marvel', listId: 9 });
      expect(entry?.fanart).toBeUndefined();
      expect(entry?.year).toBeUndefined();
    });

    it('should link an official list by its id', () => {
      expect(parse({ type: 'list', comment, list: { ...list, type: 'official', user: null } })?.href).toBe(
        '/lists/9',
      );
    });
  });

  it('should skip a row whose media is missing', () => {
    expect(parse({ type: 'episode', comment, show })).toBeNull();
  });

  it('should skip a malformed row instead of failing the list', () => {
    expect(recentCommentRowsSchema.parse([{ type: 'movie' }, { type: 'show', comment, show }])).toHaveLength(1);
  });
});
