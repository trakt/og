import { describe, expect, it } from 'vitest';
import { toGenreBar } from './toGenreBar.ts';
import type { WatchedGenreRow } from './watchedGenresSchema.ts';

const row = (counts: Partial<Pick<WatchedGenreRow, 'episodes' | 'shows' | 'movies'>>): WatchedGenreRow => ({
  play_count: 20,
  genre: { slug: 'science-fiction', name: 'Science fiction' },
  percentage: 13.6,
  percentage_row: 95.35,
  episodes: { play_count: 0, ids: [] },
  shows: { play_count: 0, ids: [] },
  movies: { play_count: 0, ids: [] },
  ...counts,
});

describe('mapper: toGenreBar', () => {
  it('should round the percentage and keep both widths', () => {
    expect(toGenreBar(row({}), { slug: 'sean' })).toMatchObject({
      slug: 'science-fiction',
      name: 'Science fiction',
      percentage: 13.6,
      percentageRow: 95.35,
      percentageText: '14%',
    });
  });

  it('should count each type with its plays when there are more, linked to that history by genre', () => {
    const bar = toGenreBar(
      row({
        episodes: { play_count: 15, ids: Array.from({ length: 12 }, (_, i) => i) },
        shows: { play_count: 5, ids: [1, 2, 3] },
        movies: { play_count: 1, ids: [4] },
      }),
      { slug: 'sean' },
    );

    expect(bar.counts).toEqual([
      { text: '12 episodes (15)', href: '/users/sean/history/episodes/plays?genres=science-fiction' },
      { text: '3 shows', href: '/users/sean/history/shows/plays?genres=science-fiction' },
      { text: '1 movie', href: '/users/sean/history/movies/plays?genres=science-fiction' },
    ]);
  });

  it('should skip the types with nothing watched', () => {
    const bar = toGenreBar(
      row({ movies: { play_count: 1_500, ids: Array.from({ length: 1_200 }, (_, i) => i) } }),
      { slug: 's' },
    );
    expect(bar.counts.map(({ text }) => text)).toEqual(['1,200 movies (1,500)']);
  });

  it('should start the history links at the chart window when it has one', () => {
    const bar = toGenreBar(row({ movies: { play_count: 1, ids: [4] } }), { slug: 'sean', startAt: '2026-08-31' });
    expect(bar.counts.at(0)?.href).toBe(
      '/users/sean/history/movies/plays?genres=science-fiction&start_at=2026-08-31',
    );
  });
});
