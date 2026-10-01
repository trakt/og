import { describe, expect, it } from 'vitest';
import { filterProgress } from './filterProgress.ts';
import { progressItemFixture } from './progressItemFixture.ts';

const done = progressItemFixture(1, { completed: 10, show: { title: 'Breaking Bad', status: 'ended' } });
const airing = progressItemFixture(2, { show: { title: 'Severance', status: 'returning series' } });
const rewatch = progressItemFixture(3, { resetAt: '2026-01-01', show: { title: 'The Wire', status: 'canceled' } });
const items = [done, airing, rewatch];
const ids = (filtered: readonly { show: { id: number } }[]) => filtered.map(({ show }) => show.id);

describe('filterProgress', () => {
  it('should apply each HIDE toggle', () => {
    expect(ids(filterProgress(items, { hide: ['completed'] }))).toEqual([2, 3]);
    expect(ids(filterProgress(items, { hide: ['not-completed'] }))).toEqual([1]);
    expect(ids(filterProgress(items, { hide: ['ended'] }))).toEqual([2]);
    expect(ids(filterProgress(items, { hide: ['airing'] }))).toEqual([1, 3]);
    expect(ids(filterProgress(items, { hide: ['rewatching'] }))).toEqual([1, 2]);
  });

  it('should match the title search anywhere in the title, ignoring case', () => {
    expect(ids(filterProgress(items, { hide: [], terms: ' bad ' }))).toEqual([1]);
  });

  it('should keep only listed shows with a list filter', () => {
    expect(ids(filterProgress(items, { hide: [], listed: new Set([2, 3]) }))).toEqual([2, 3]);
  });
});
