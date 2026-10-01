import { describe, expect, it } from 'vitest';
import { toUserComment } from './toUserComment.ts';
import type { UserCommentRow } from './UserCommentRow.ts';

const comment = { id: 5, comment: 'Great', review: false } as unknown as UserCommentRow['comment'];
const show = {
  title: 'Andor',
  year: 2022,
  ids: { trakt: 1, slug: 'andor' },
  genres: ['drama'],
  aired_episodes: 24,
  images: { poster: ['media.trakt.tv/images/shows/000/000/001/posters/medium/a.jpg.webp'] },
};

describe('toUserComment', () => {
  it('should put an episode comment beside its screenshot, with the show linked under it', () => {
    const episode = {
      season: 2,
      number: 1,
      title: 'One Year Later',
      ids: { trakt: 100 },
      rating: 8.4,
      images: { screenshot: ['media.trakt.tv/images/episodes/000/000/100/screenshots/medium/b.jpg.webp'] },
    };

    expect(toUserComment({ type: 'episode', comment, show, episode })).toMatchObject({
      comment,
      item: { type: 'episode', id: 100, show: 1, season: 2 },
      inlineTitle: 'Andor: 2x01 One Year Later',
      poster: {
        type: 'episode',
        href: '/shows/andor/seasons/2/episodes/1',
        number: '2x01',
        title: 'One Year Later',
        image: 'https://media.trakt.tv/images/episodes/000/000/100/screenshots/thumb/b.jpg.webp',
        variant: 'screenshot',
        rating: 8.4,
        show: { text: 'Andor', href: '/shows/andor' },
      },
    });
  });

  it('should fall back to the show poster and name a season by its number', () => {
    const season = { number: 0, ids: { trakt: 50 }, aired_episodes: 3, images: { poster: [] } };

    expect(toUserComment({ type: 'season', comment, show, season })).toMatchObject({
      item: { type: 'season', id: 50, show: 1, number: 0 },
      inlineTitle: 'Andor: Specials',
      poster: {
        href: '/shows/andor/seasons/0',
        title: 'Specials',
        image: 'https://media.trakt.tv/images/shows/000/000/001/posters/thumb/a.jpg.webp',
        seasonOf: { show: 1, number: 0 },
        airedEpisodes: 3,
      },
    });
  });

  it('should keep public list comments and skip private ones, like OG', () => {
    const list = {
      name: 'Best Heists',
      privacy: 'public',
      ids: { trakt: 7, slug: 'best-heists' },
      user: { ids: { slug: 'sean' } },
    };
    const row = { type: 'list', comment, list };

    expect(toUserComment(row)?.poster).toMatchObject({ type: 'list', href: '/users/sean/lists/best-heists' });
    expect(toUserComment({ ...row, list: { ...list, privacy: 'private' } })).toBeNull();
  });

  it('should skip a row whose media is missing', () => {
    expect(toUserComment({ type: 'movie', comment, movie: null })).toBeNull();
    expect(toUserComment({ type: 'person', comment })).toBeNull();
  });
});
