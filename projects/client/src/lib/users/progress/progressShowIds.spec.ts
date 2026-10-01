import { describe, expect, it } from 'vitest';
import type { OverlaySlices } from '../../overlay/OverlaySlices.ts';
import { progressShowIds } from './progressShowIds.ts';

const seasons = new Map([[1, new Map([[11, ['2026-01-01']]])]]);
const none = { shows: new Set<number>(), seasons: new Map() };

const slices = (overrides: Partial<OverlaySlices> = {}): Partial<OverlaySlices> => ({
  watchedShows: new Map([[1, seasons], [2, seasons], [3, seasons]]),
  collectedShows: new Map([[4, new Map()], [1, new Map()]]),
  rewatching: new Map(),
  dropped: new Map([[2, '2026-02-01']]),
  progressHidden: { watched: { shows: new Set([3]), seasons: new Map() }, collected: none },
  watchlist: { movie: new Set(), show: new Set([1, 5]) },
  ...overrides,
});

const off = { includeWatchlisted: false, includeOther: false };

describe('progressShowIds', () => {
  it('should list watched shows, minus dropped and hidden ones', () => {
    expect(progressShowIds({ type: 'watched', slices: slices(), options: off })).toEqual({
      ready: true,
      ids: [1],
      watchlistOnly: new Set(),
    });
  });

  it('should add the library and unstarted watchlist shows when the settings include them', () => {
    const result = progressShowIds({
      type: 'watched',
      slices: slices(),
      options: { includeWatchlisted: true, includeOther: true },
    });

    expect(result).toEqual({ ready: true, ids: [1, 4, 5], watchlistOnly: new Set([5]) });
  });

  it('should list only dropped shows on the Dropped tab', () => {
    expect(progressShowIds({ type: 'dropped', slices: slices(), options: off })).toMatchObject({ ids: [2] });
  });

  it('should list the library on the Library tab, dropped shows included', () => {
    const result = progressShowIds({
      type: 'library',
      slices: slices({ collectedShows: new Map([[2, new Map()], [4, new Map()]]) }),
      options: off,
    });

    expect(result).toMatchObject({ ids: [2, 4] });
  });

  it('should leave out a show hidden on this page before the hide saved', () => {
    const hidden = new Map([['progress_collected', new Set(['show:4'])]]);
    expect(progressShowIds({ type: 'library', slices: slices({ hidden }), options: off })).toMatchObject({ ids: [1] });
  });

  it('should not be ready until every slice the tab reads has loaded', () => {
    expect(progressShowIds({ type: 'watched', slices: slices({ rewatching: undefined }), options: off }).ready).toBe(
      false,
    );
    expect(
      progressShowIds({
        type: 'watched',
        slices: slices({ watchlist: undefined }),
        options: { includeWatchlisted: true, includeOther: false },
      }).ready,
    ).toBe(false);
  });
});
