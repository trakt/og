import { describe, expect, it } from 'vitest';
import { apiSortHow, librarySort } from './librarySort.ts';

describe('librarySort', () => {
  it('should read the sort segments, falling back to Added Date for a sort the type lacks', () => {
    expect(librarySort('movies', 'title/asc')).toEqual({ by: 'title', how: 'asc' });
    expect(librarySort('episodes', 'runtime/desc')).toEqual({ by: 'added', how: 'desc' });
    expect(librarySort('shows', 'title/asc')).toEqual({ by: 'added', how: 'asc' });
    expect(librarySort('all', undefined)).toEqual({ by: 'added', how: 'asc' });
  });
});

describe('apiSortHow', () => {
  it("should flip OG's asc to the API's desc, except Title", () => {
    expect(apiSortHow({ by: 'added', how: 'asc' })).toBe('desc');
    expect(apiSortHow({ by: 'votes', how: 'desc' })).toBe('asc');
    expect(apiSortHow({ by: 'title', how: 'asc' })).toBe('asc');
    expect(apiSortHow({ by: 'title', how: 'desc' })).toBe('desc');
  });
});
