import { describe, expect, it } from 'vitest';
import type { ListItemRow } from './listItemRowsSchema.ts';
import { toListStats } from './toListStats.ts';

const listed = { rank: 1, id: 1, listed_at: '2026-01-01T00:00:00.000Z' };
const show = {
  title: 'Severance',
  ids: { trakt: 7, slug: 'severance' },
  runtime: 50,
  total_runtime: 950,
  aired_episodes: 19,
};

const rows: ListItemRow[] = [
  { ...listed, type: 'movie', movie: { title: 'Heat', ids: { trakt: 1, slug: 'heat' }, runtime: 170 } },
  { ...listed, type: 'movie', movie: { title: 'Unknown', ids: { trakt: 2, slug: 'unknown' }, runtime: null } },
  { ...listed, type: 'show', show },
  {
    ...listed,
    type: 'season',
    show,
    season: { number: 1, ids: { trakt: 70 }, total_runtime: 450, aired_episodes: 9 },
  },
  { ...listed, type: 'episode', show, episode: { season: 1, number: 2, ids: { trakt: 700 }, runtime: 0 } },
  { ...listed, type: 'person', person: { name: 'Adam Scott', ids: { trakt: 9, slug: 'adam-scott' } } },
];

describe('toListStats', () => {
  it('should count every row and sum OG’s total runtimes', () => {
    // 170 + 90 (a movie without one) + 950 + 450 + 50 (the show's, for an episode without one) + 0.
    expect(toListStats(rows, { withItems: false })).toEqual({ count: 6, runtime: 1710 });
  });

  it('should fall back to 42 minutes for an episode of a show without a runtime', () => {
    const episode: ListItemRow = {
      ...listed,
      type: 'episode',
      show: { ...show, runtime: null },
      episode: { season: 1, number: 1, ids: { trakt: 701 } },
    };
    expect(toListStats([episode], { withItems: false }).runtime).toBe(42);
  });

  it('should list everything but people for the percentages', () => {
    expect(toListStats(rows, { withItems: true }).items).toEqual([
      { type: 'movie', id: 1 },
      { type: 'movie', id: 2 },
      { type: 'show', id: 7, airedEpisodes: 19 },
      { type: 'season', id: 70, airedEpisodes: 9, seasonOf: { show: 7, number: 1 } },
      { type: 'episode', id: 700, seasonOf: { show: 7, number: 1, episode: 2 } },
    ]);
  });

  it('should be empty for an empty list', () => {
    expect(toListStats([], { withItems: true })).toEqual({ count: 0, runtime: 0, items: [] });
  });
});
