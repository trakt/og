import { describe, expect, it } from 'vitest';
import { listCommentSort } from './listCommentSort.ts';

describe('listCommentSort', () => {
  it('should default unsupported legacy sorts to all-time reactions', () => {
    for (const sort of ['', 'likes_30', 'replies_30', 'plays', 'rating', 'bad']) {
      expect(listCommentSort(new URLSearchParams({ sort_by: sort }))).toBe('likes');
    }
  });
  it('should preserve native sorts and translate both OG added-date directions', () => {
    for (const sort of ['likes', 'replies', 'newest', 'oldest']) {
      expect(listCommentSort(new URLSearchParams({ sort_by: sort }))).toBe(sort);
    }
    expect(listCommentSort(new URLSearchParams('sort_by=added&sort_how=asc'))).toBe('newest');
    expect(listCommentSort(new URLSearchParams('sort_by=added&sort_how=desc'))).toBe('oldest');
  });
});
