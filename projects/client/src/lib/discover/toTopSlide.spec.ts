import type { MovieResponse, ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toTopSlide } from './toTopSlide.ts';

const NOW = new Date('2026-09-30T12:00:00Z');

const show = {
  title: 'Lanterns',
  year: 2026,
  ids: { trakt: 157599, slug: 'lanterns' },
  first_aired: '2026-08-18T01:00:00.000Z',
  aired_episodes: 8,
  runtime: 60,
  rating: 7.4,
  images: {
    poster: ['media.trakt.tv/images/shows/000/157/599/posters/medium/1fdc413e93.jpg.webp'],
    fanart: ['media.trakt.tv/images/shows/000/157/599/fanarts/medium/4feb71753a.jpg.webp'],
  },
} as ShowResponse;

const movie = {
  title: 'The Love Hypothesis',
  year: 2026,
  ids: { trakt: 9, slug: 'the-love-hypothesis-2026' },
  released: '2026-10-15',
  runtime: 101,
  rating: 6.8,
} as MovieResponse;

describe('mapper: toTopSlide', () => {
  describe('for shows', () => {
    const slide = toTopSlide(
      { show, watcher_count: 49_771, play_count: 88_680, collected_count: 4_207 },
      NOW,
    );

    it('should link the show and size its images', () => {
      expect(slide).toMatchObject({
        type: 'show',
        id: 157599,
        href: '/shows/lanterns',
        title: 'Lanterns',
        fullTitle: 'Lanterns (2026)',
        poster: 'https://media.trakt.tv/images/shows/000/157/599/posters/thumb/1fdc413e93.jpg.webp',
        fanart: 'https://media.trakt.tv/images/shows/000/157/599/fanarts/medium/4feb71753a.jpg.webp',
        released: true,
        rating: 7.4,
        airedEpisodes: 8,
        runtime: 60,
      });
    });

    it('should abbreviate the stats and count collected episodes as libraries', () => {
      expect(slide.stats).toEqual([
        { value: '49.8k', label: 'watchers' },
        { value: '88.7k', label: 'plays' },
        { value: '4.2k', label: 'libraries' },
      ]);
    });
  });

  describe('for movies', () => {
    const slide = toTopSlide({ movie, watcher_count: 1, play_count: 1, collected_count: 0 }, NOW);

    it('should link the movie and leave out missing images', () => {
      expect(slide).toMatchObject({
        type: 'movie',
        href: '/movies/the-love-hypothesis-2026',
        airedEpisodes: undefined,
      });
      expect(slide.poster).toBeUndefined();
      expect(slide.fanart).toBeUndefined();
    });

    it('should treat an upcoming release as unreleased', () => {
      expect(slide.released).toBe(false);
    });

    it('should use the singular only for exactly one', () => {
      expect(slide.stats).toEqual([
        { value: '1', label: 'watcher' },
        { value: '1', label: 'play' },
        { value: '0', label: 'libraries' },
      ]);
    });
  });
});
