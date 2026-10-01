import { describe, expect, it } from 'vitest';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import { toProgressItems } from './toProgressItems.ts';

const show = (id: number, airedEpisodes: number): CachedShow => ({
  id,
  slug: `show-${id}`,
  title: `Show ${id}`,
  genres: [],
  airedEpisodes,
  fetchedAt: 0,
  complete: true,
});

const options = { includeSpecials: false, includeWatchlisted: true, includeOther: false, useLastActivity: false };

describe('toProgressItems', () => {
  it('should compute cached shows and report the ones still missing a summary', () => {
    const { items, missing } = toProgressItems({
      type: 'watched',
      showIds: { ready: true, ids: [1, 2], watchlistOnly: new Set() },
      slices: { watchedShows: new Map([[1, new Map([[1, new Map([[11, ['2026-01-01']]])]])]]) },
      shows: new Map([[1, show(1, 10)]]),
      catalogs: new Map(),
      options,
      now: 0,
    });

    expect(items.map(({ show, completed }) => [show.id, completed])).toEqual([[1, 1]]);
    expect(missing).toEqual([2]);
  });

  it('should leave out a watchlisted show with nothing aired', () => {
    const { items } = toProgressItems({
      type: 'watched',
      showIds: { ready: true, ids: [1, 2], watchlistOnly: new Set([1, 2]) },
      slices: {},
      shows: new Map([[1, show(1, 0)], [2, show(2, 3)]]),
      catalogs: new Map(),
      options,
      now: 0,
    });

    expect(items.map(({ show }) => show.id)).toEqual([2]);
  });

  it('should carry the reset date on Watched and the drop date on Dropped', () => {
    const params = {
      showIds: { ready: true as const, ids: [1], watchlistOnly: new Set<number>() },
      slices: { rewatching: new Map([[1, '2026-01-01']]), dropped: new Map([[1, '2026-02-01']]) },
      shows: new Map([[1, show(1, 3)]]),
      catalogs: new Map(),
      options,
      now: 0,
    };

    expect(toProgressItems({ ...params, type: 'watched' }).items.at(0)).toMatchObject({
      resetAt: '2026-01-01',
      droppedAt: undefined,
    });
    expect(toProgressItems({ ...params, type: 'dropped' }).items.at(0)?.droppedAt).toBe('2026-02-01');
    expect(toProgressItems({ ...params, type: 'library' }).items.at(0)?.resetAt).toBeUndefined();
  });
});
