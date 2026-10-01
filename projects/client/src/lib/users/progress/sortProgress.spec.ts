import { describe, expect, it } from 'vitest';
import { progressItemFixture } from './progressItemFixture.ts';
import { sortProgress } from './sortProgress.ts';

const items = [
  progressItemFixture(1, { lastAt: '2026-01-01', completed: 9, show: { title: 'Banshee', votes: 5 } }),
  progressItemFixture(2, { lastAt: '2026-03-01', completed: 2, show: { title: 'archer', votes: 50 } }),
  progressItemFixture(3, { lastAt: '2026-02-01', completed: 5, show: { title: 'Castle', votes: 50 } }),
];
const ids = (sorted: readonly { show: { id: number } }[]) => sorted.map(({ show }) => show.id);

describe('sortProgress', () => {
  it("should put OG's Activity Date ascending as the most recent first", () => {
    expect(ids(sortProgress(items, { by: 'added', how: 'asc' }))).toEqual([2, 3, 1]);
    expect(ids(sortProgress(items, { by: 'added', how: 'desc' }))).toEqual([1, 3, 2]);
  });

  it('should sort titles A to Z, ignoring case', () => {
    expect(ids(sortProgress(items, { by: 'title', how: 'asc' }))).toEqual([2, 1, 3]);
  });

  it('should put the most complete first and the fewest episodes left first', () => {
    expect(ids(sortProgress(items, { by: 'completed', how: 'asc' }))).toEqual([1, 3, 2]);
    expect(ids(sortProgress(items, { by: 'episodes', how: 'asc' }))).toEqual([1, 3, 2]);
  });

  it('should break ties on the higher show id', () => {
    expect(ids(sortProgress(items, { by: 'popularity', how: 'asc' }))).toEqual([3, 2, 1]);
  });

  it('should read an old sort name as the sort it meant', () => {
    expect(ids(sortProgress(items, { by: 'most-completed', how: 'asc' }))).toEqual([1, 3, 2]);
  });

  it('should keep a random order for the same seed', () => {
    const once = ids(sortProgress(items, { by: 'random', how: 'asc' }, 7));
    expect(ids(sortProgress(items.toReversed(), { by: 'random', how: 'asc' }, 7))).toEqual(once);
  });
});
