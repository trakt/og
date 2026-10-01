import { describe, expect, it } from 'vitest';
import { collectedCounts } from './collectedCounts.ts';
import { createOverlay } from './createOverlay.svelte.ts';

describe('collectedCounts', () => {
  it('should keep missing collections unknown and distinguish them from empty collections', () => {
    expect(collectedCounts({})).toEqual({ episodes: undefined, shows: undefined, movies: undefined });
    expect(collectedCounts({ collectedShows: new Map(), collectedMovies: new Map() })).toEqual({
      episodes: 0,
      shows: 0,
      movies: 0,
    });
  });

  it('should count every episode including specials, omit empty shows, and count each movie once', () => {
    const shows = new Map([
      [1, new Map([[0, new Map([[1, 'date']])], [1, new Map([[1, 'date'], [2, 'date']])]])],
      [2, new Map([[1, new Map([[1, 'date']])]])],
      [3, new Map([[1, new Map<number, string>()]])],
    ]);
    expect(collectedCounts({ collectedShows: shows, collectedMovies: new Map([[1, 'date'], [2, 'date']]) })).toEqual({
      episodes: 4,
      shows: 2,
      movies: 2,
    });
  });

  it('should update the dashboard count on optimistic collection changes and rollbacks', () => {
    const overlay = createOverlay({
      get: () => Promise.resolve(new Response()),
      storage: { load: () => Promise.resolve([]), save: () => Promise.resolve(), clearExcept: () => Promise.resolve() },
    });
    const rollback = overlay.patch(
      'collectedShows',
      () => new Map([[1, new Map([[1, new Map([[1, 'date']])]])]]),
      new Map(),
    );
    expect(overlay.collectionCounts().episodes).toBe(1);
    rollback();
    expect(overlay.collectionCounts().episodes).toBeUndefined();
  });
});
