import { describe, expect, it } from 'vitest';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import { planShowReads } from './planShowReads.ts';

const record = (id: number, fetchedAt: number, complete = true): [number, CachedShow] => [
  id,
  { id, slug: `${id}`, title: `${id}`, genres: [], fetchedAt, complete },
];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('planShowReads', () => {
  it('should read nothing when every summary is fresh, even without a poster', () => {
    const plan = planShowReads({
      ids: [1, 2],
      watched: new Set([1, 2]),
      watchlistOnly: new Set(),
      cached: new Map([record(1, 0), record(2, 0, false)]),
      now: 5,
      ttl: 10,
    });

    expect(plan).toEqual({ watched: false, watchlist: false, single: [] });
  });

  it('should read a few stale shows one at a time', () => {
    const plan = planShowReads({
      ids: [1, 2, 3],
      watched: new Set([1]),
      watchlistOnly: new Set([2]),
      cached: new Map([record(1, 0)]),
      now: 10,
      ttl: 10,
      bulkAt: 1,
    });

    expect(plan).toEqual({ watched: false, watchlist: false, single: [1, 2, 3] });
  });

  it('should take the bulk read for a group with many stale shows, and singles for the rest', () => {
    const plan = planShowReads({
      ids: [...range(1, 5), 100, 200],
      watched: new Set(range(1, 5)),
      watchlistOnly: new Set([100]),
      cached: new Map(),
      now: 0,
      ttl: 10,
      bulkAt: 2,
    });

    expect(plan).toEqual({ watched: true, watchlist: false, single: [100, 200] });
  });
});
