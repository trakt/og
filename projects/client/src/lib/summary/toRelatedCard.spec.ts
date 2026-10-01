import type { MovieResponse, ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toRelatedCard } from './toRelatedCard.ts';

const now = new Date('2026-09-29T12:00:00Z');

describe('toRelatedCard', () => {
  it('should map a released movie with its poster, fanart and rating', () => {
    const movie = {
      title: 'Deadpool 2',
      year: 2018,
      ids: { trakt: 1, slug: 'deadpool-2-2018' },
      released: '2018-05-18',
      rating: 7.5,
      runtime: 119,
      images: {
        poster: ['media.trakt.tv/images/movies/1/posters/medium/a.jpg.webp'],
        fanart: ['media.trakt.tv/images/movies/1/fanarts/medium/b.jpg.webp'],
      },
    } as MovieResponse;
    expect(toRelatedCard({ type: 'movie', item: movie }, now)).toEqual({
      type: 'movie',
      id: 1,
      href: '/movies/deadpool-2-2018',
      title: 'Deadpool 2',
      year: 2018,
      poster: 'https://media.trakt.tv/images/movies/1/posters/thumb/a.jpg.webp',
      fanart: 'https://media.trakt.tv/images/movies/1/fanarts/thumb/b.jpg.webp',
      released: true,
      rating: 7.5,
      airedEpisodes: undefined,
      runtime: 119,
    });
  });

  it("should keep a show's aired episodes and call an unaired show unreleased", () => {
    const show = {
      title: 'Next Year',
      year: 2027,
      ids: { trakt: 2, slug: 'next-year' },
      first_aired: '2027-01-01T00:00:00.000Z',
      aired_episodes: 0,
    } as ShowResponse;
    expect(toRelatedCard({ type: 'show', item: show }, now)).toMatchObject({
      href: '/shows/next-year',
      released: false,
      airedEpisodes: 0,
      poster: undefined,
    });
  });
});
