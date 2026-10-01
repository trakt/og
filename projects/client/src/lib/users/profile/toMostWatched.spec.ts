import { describe, expect, it } from 'vitest';
import { toMostWatched } from './toMostWatched.ts';

const media = (id: number, runtime: number | null) => ({
  ids: { trakt: id, slug: `item-${id}` },
  title: `Item ${id}`,
  year: 2020,
  runtime,
  rating: 8,
  aired_episodes: 10,
  images: { poster: [`media.trakt.tv/images/${id}/posters/medium/a.jpg.webp`] },
});

const episodePlay = (show: number, at: string, runtime: number | null = 30) => ({
  watched_at: at,
  episode: { runtime },
  show: media(show, 45),
});
const moviePlay = (movie: number, runtime: number | null, at = '2026-09-10T00:00:00.000Z') => ({
  watched_at: at,
  movie: media(movie, runtime),
});

describe('mapper: toMostWatched', () => {
  describe('for shows', () => {
    it('should rank the last 30 days by plays, then the latest watch, and sum each play runtime', () => {
      const { lastMonth } = toMostWatched('shows', {
        history: [
          episodePlay(1, '2026-09-01T00:00:00.000Z'),
          episodePlay(2, '2026-09-05T00:00:00.000Z', null),
          episodePlay(2, '2026-09-04T00:00:00.000Z', 60),
          episodePlay(3, '2026-09-02T00:00:00.000Z'),
          episodePlay(4, '2026-09-03T00:00:00.000Z'),
        ],
        watched: [],
      });

      expect(lastMonth.map(({ id }) => id)).toEqual([2, 4, 3]);
      // An episode without a runtime uses its show's.
      expect(lastMonth.at(0)).toMatchObject({
        type: 'show',
        href: '/shows/item-2',
        time: '1h 45m',
        plays: '2 plays',
        airedEpisodes: 10,
        image: 'https://media.trakt.tv/images/2/posters/thumb/a.jpg.webp',
      });
    });

    it('should time all time plays by the show runtime', () => {
      const { allTime } = toMostWatched('shows', {
        history: [],
        watched: [
          { plays: 3, last_watched_at: '2026-01-01T00:00:00.000Z', show: media(1, 60) },
          { plays: 9, last_watched_at: '2025-01-01T00:00:00.000Z', show: media(2, null) },
        ],
      });

      expect(allTime.map(({ id, time, plays }) => ({ id, time, plays }))).toEqual([
        { id: 2, time: '6h 18m', plays: '9 plays' },
        { id: 1, time: '3h', plays: '3 plays' },
      ]);
    });
  });

  describe('for movies', () => {
    it('should rank by time watched, then plays, with OG runtime fallback', () => {
      const { lastMonth, allTime } = toMostWatched('movies', {
        history: [moviePlay(1, 100), moviePlay(2, null), moviePlay(3, 180)],
        watched: [
          { plays: 1, last_watched_at: '2026-01-01T00:00:00.000Z', movie: media(1, 200) },
          { plays: 2, last_watched_at: '2025-01-01T00:00:00.000Z', movie: media(2, 100) },
          { plays: 1, last_watched_at: '2025-01-01T00:00:00.000Z', movie: media(3, 90) },
          { plays: 1, last_watched_at: '2025-01-01T00:00:00.000Z', movie: media(4, 10) },
        ],
      });

      expect(lastMonth.map(({ id, time }) => ({ id, time }))).toEqual([
        { id: 3, time: '3h' },
        { id: 1, time: '1h 40m' },
        { id: 2, time: '1h 30m' },
      ]);
      expect(allTime.map(({ id, plays }) => ({ id, plays }))).toEqual([
        { id: 2, plays: '2 plays' },
        { id: 1, plays: '1 play' },
        { id: 3, plays: '1 play' },
      ]);
      expect(allTime.at(0)).toMatchObject({ type: 'movie', href: '/movies/item-2', airedEpisodes: undefined });
    });
  });

  describe("with the owner's saved settings", () => {
    const watched = [
      { plays: 5, last_watched_at: '2026-01-01T00:00:00.000Z', movie: media(1, 30) },
      { plays: 1, last_watched_at: '2026-01-01T00:00:00.000Z', movie: media(2, 200) },
    ];

    it("should default to OG's sort and the Last 30 Days tab", () => {
      expect(toMostWatched('movies', { history: [], watched })).toMatchObject({ sortBy: 'time', tab: 'lastMonth' });
      expect(toMostWatched('shows', { history: [], watched: [] })).toMatchObject({ sortBy: 'plays', tab: 'lastMonth' });
    });

    it('should sort by the saved order and open the saved tab', () => {
      const result = toMostWatched('movies', { history: [], watched, prefs: { sort_by: 'plays', tab: 'all_time' } });

      expect(result.allTime.map(({ id }) => id)).toEqual([1, 2]);
      expect(result).toMatchObject({ sortBy: 'plays', tab: 'allTime' });
    });
  });
});
