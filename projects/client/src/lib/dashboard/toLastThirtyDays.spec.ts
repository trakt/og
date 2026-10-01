import { describe, expect, it } from 'vitest';
import type { WatchedGenreRow } from '../users/profile/watchedGenresSchema.ts';
import { toLastThirtyDays } from './toLastThirtyDays.ts';

const now = new Date('2026-09-30T15:00:00Z');
const start = '2026-08-31T00:00:00.000Z';

const episode = (id: number, watchedAt: string, runtime: number | null = 45) => ({
  watched_at: watchedAt,
  episode: { ids: { trakt: id }, runtime },
  show: { runtime: 30 },
});
const movie = (id: number, watchedAt: string, runtime = 120) => ({
  watched_at: watchedAt,
  movie: { ids: { trakt: id }, runtime },
});

const genre: WatchedGenreRow = {
  play_count: 2,
  genre: { slug: 'drama', name: 'Drama' },
  percentage: 100,
  percentage_row: 100,
  episodes: { play_count: 0, ids: [] },
  shows: { play_count: 0, ids: [] },
  movies: { play_count: 2, ids: [1, 2] },
};

const build = (
  { episodes = [], movies = [], timeZone = 'UTC' }: {
    episodes?: ReturnType<typeof episode>[];
    movies?: ReturnType<typeof movie>[];
    timeZone?: string;
  },
) => toLastThirtyDays({ episodes, movies, genres: [genre], start, slug: 'sean', now, timeZone });

describe('mapper: toLastThirtyDays', () => {
  it('should chart today and the 29 days before it, oldest first', () => {
    const { days } = build({ episodes: [episode(1, '2026-09-30T10:00:00Z')] });

    expect(days).toHaveLength(30);
    expect(days.at(0)).toMatchObject({ date: '2026-09-01', day: 1 });
    expect(days.at(-1)).toMatchObject({ date: '2026-09-30', day: 30, label: 'Wednesday — Sep 30' });
  });

  it("should put each play on its day in the viewer's zone and leave out anything older", () => {
    const { days, episodes } = build({
      episodes: [episode(1, '2026-09-29T02:00:00Z'), episode(2, '2026-08-31T12:00:00Z')],
      timeZone: 'America/New_York',
    });

    expect(days.find(({ date }) => date === '2026-09-28')?.minutes).toBe(45);
    expect(days.reduce((sum, { minutes }) => sum + minutes, 0)).toBe(45);
    expect(episodes).toEqual({ count: '1', word: 'episode' });
  });

  it('should sum each play, falling back to the show runtime, and top the scale at the next 10 minutes', () => {
    const { days, time } = build({
      episodes: [episode(1, '2026-09-30T10:00:00Z'), episode(2, '2026-09-30T11:00:00Z', null)],
      movies: [movie(3, '2026-09-29T20:00:00Z', 50)],
    });

    expect(time).toBe('2h 5m');
    // 75 minutes is the busiest day, so the top is 80.
    expect(days.at(-1)).toMatchObject({ minutes: 75, height: 93.75, time: '1h 15m' });
    expect(days.at(-2)?.height).toBe(62.5);
    expect(days.at(0)?.height).toBe(0);
  });

  it('should count unique items with their plays, in the help line and each tooltip', () => {
    const last = build({
      episodes: [
        episode(1, '2026-09-30T10:00:00Z'),
        episode(1, '2026-09-30T11:00:00Z'),
        episode(2, '2026-09-30T12:00:00Z'),
        episode(1, '2026-09-20T12:00:00Z'),
      ],
      movies: [movie(3, '2026-09-30T20:00:00Z')],
    });

    expect(last.episodes).toEqual({ count: '2', word: 'episodes', plays: '(4 plays)' });
    expect(last.movies).toEqual({ count: '1', word: 'movie' });
    expect(last.days.at(-1)?.counts).toEqual(['2 episodes (3 plays)', '1 movie']);
    expect(last.days.at(-11)?.counts).toEqual(['1 episode']);
  });

  it("should link each day to the viewer's history for that day", () => {
    const { days } = build({ movies: [movie(3, '2026-09-30T20:00:00Z')] });

    expect(days.at(-1)?.href).toBe('/users/sean/history?start_at=2026-09-30&days=1');
  });

  it('should drop the chart with nothing watched, and keep the genres', () => {
    const last = build({});

    expect(last.days).toEqual([]);
    expect(last.time).toBe('0m');
    expect(last.genres).toHaveLength(1);
  });

  it("should start the genre links at the window's first day", () => {
    const { genres } = build({});

    expect(genres.at(0)?.counts.at(0)?.href).toBe('/users/sean/history/movies/plays?genres=drama&start_at=2026-08-31');
  });
});
