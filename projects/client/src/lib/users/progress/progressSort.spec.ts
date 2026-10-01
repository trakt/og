import { describe, expect, it } from 'vitest';
import { literalProgressSort, progressSort, progressSortLabel } from './progressSort.ts';

describe('progressSort', () => {
  it('should default to Activity Date ascending', () => {
    expect(progressSort({})).toEqual({ by: 'added', how: 'asc', supported: true });
  });

  it('should read the sort and direction from the path', () => {
    expect(progressSort({ segments: 'completed/desc' })).toEqual({ by: 'completed', how: 'desc', supported: true });
    expect(progressSort({ segments: 'total-runtime' })).toEqual({ by: 'total-runtime', how: 'asc', supported: true });
  });

  it('should use the saved sort only when the path has none', () => {
    const saved = { sort: 'plays', sort_how: 'desc' };
    expect(progressSort({ saved })).toEqual({ by: 'plays', how: 'desc', supported: true });
    expect(progressSort({ segments: 'title/asc', saved })).toEqual({ by: 'title', how: 'asc', supported: true });
  });

  it('should keep an old sort name as unsupported, in its own direction', () => {
    expect(progressSort({ segments: 'recently-aired/desc' })).toEqual({
      by: 'recently-aired',
      how: 'asc',
      supported: false,
    });
  });

  it('should fall back to the default for an unknown name', () => {
    expect(progressSort({ segments: 'dropped' })).toEqual({ by: 'added', how: 'asc', supported: true });
  });
});

describe('progressSortLabel', () => {
  it('should name Activity Date after the tab', () => {
    expect(progressSortLabel('added', 'watched')).toBe('Watched Date');
    expect(progressSortLabel('added', 'library')).toBe('Library Date');
  });

  it('should title case an old sort name', () => {
    expect(progressSortLabel('completed', 'watched')).toBe('Completion %');
    expect(progressSortLabel('most-plays', 'watched')).toBe('Most Plays');
  });
});

describe('literalProgressSort', () => {
  it('should flip the sorts whose own order is descending, as a literal key order', () => {
    expect(literalProgressSort({ by: 'added', how: 'asc' })).toEqual({ by: 'added', how: 'desc' });
    expect(literalProgressSort({ by: 'completed', how: 'desc' })).toEqual({ by: 'completed', how: 'asc' });
    expect(literalProgressSort({ by: 'title', how: 'asc' })).toEqual({ by: 'title', how: 'asc' });
    expect(literalProgressSort({ by: 'episodes', how: 'desc' })).toEqual({ by: 'episodes', how: 'desc' });
  });

  it('should resolve an old name to the sort it meant', () => {
    expect(literalProgressSort({ by: 'least-plays', how: 'asc' })).toEqual({ by: 'plays', how: 'asc' });
    expect(literalProgressSort({ by: 'most-time', how: 'asc' })).toEqual({ by: 'time', how: 'asc' });
  });
});
