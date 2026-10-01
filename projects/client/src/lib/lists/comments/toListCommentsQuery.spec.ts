import { describe, expect, it } from 'vitest';
import { toListCommentsQuery } from './toListCommentsQuery.ts';

describe('toListCommentsQuery', () => {
  it('should default to all-time reactions, page one and 100 a page', () => {
    expect(toListCommentsQuery(new URLSearchParams())).toEqual({ sort: 'likes', page: 1, limit: 100 });
  });
  it('should read the sort, page and page size from OG query strings', () => {
    expect(toListCommentsQuery(new URLSearchParams('sort_by=added&sort_how=desc&page=3&limit=20'))).toEqual({
      sort: 'oldest',
      page: 3,
      limit: 20,
    });
  });
  it('should cap oversized pages and fall back on junk numbers', () => {
    expect(toListCommentsQuery(new URLSearchParams('page=bad&limit=500'))).toMatchObject({ page: 1, limit: 100 });
    expect(toListCommentsQuery(new URLSearchParams('page=-2&limit=0'))).toMatchObject({ page: 1, limit: 1 });
  });
});
