import { describe, expect, it } from 'vitest';
import { resolveListSort } from './resolveListSort.ts';

const fallback = { by: 'added', how: 'desc' } as const;

describe('resolveListSort', () => {
  it('should use the list default when the URL has none', () => {
    expect(resolveListSort({ query: {}, fallback, vip: false })).toEqual(fallback);
  });

  it('should take the URL sort and direction over the default', () => {
    expect(resolveListSort({ query: { sortBy: 'title', sortHow: 'asc' }, fallback, vip: false }))
      .toEqual({ by: 'title', how: 'asc' });
    expect(resolveListSort({ query: { sortHow: 'asc' }, fallback, vip: false })).toEqual({ by: 'added', how: 'asc' });
  });

  it('should fall back to rank for a VIP sort when the viewer is not a VIP', () => {
    expect(resolveListSort({ query: { sortBy: 'imdb_rating' }, fallback, vip: false }))
      .toEqual({ by: 'rank', how: 'desc' });
    expect(resolveListSort({ query: { sortBy: 'imdb_rating' }, fallback, vip: true }))
      .toEqual({ by: 'imdb_rating', how: 'desc' });
  });

  it('should use rank for a default sort the menu does not know', () => {
    expect(resolveListSort({ query: {}, fallback: { by: 'mystery', how: 'asc' }, vip: true }))
      .toEqual({ by: 'rank', how: 'asc' });
  });
});
