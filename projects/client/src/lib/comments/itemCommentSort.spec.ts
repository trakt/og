import { describe, expect, it } from 'vitest';
import { itemCommentsHref, itemCommentSort } from './itemCommentSort.ts';

describe('itemCommentSort', () => {
  it('should default to all-time reactions', () => {
    expect(itemCommentSort(undefined, null)).toEqual({ by: 'likes', how: 'asc', reversible: false, api: 'likes' });
  });

  it('should fall back to reactions for the cut 30-day and watched sorts', () => {
    expect(itemCommentSort('likes_30', null).api).toBe('likes');
    expect(itemCommentSort('watched', 'desc').api).toBe('likes');
  });

  it('should map rating and added date both ways', () => {
    expect(itemCommentSort('rating', null).api).toBe('highest');
    expect(itemCommentSort('rating', 'desc').api).toBe('lowest');
    expect(itemCommentSort('added', 'asc').api).toBe('newest');
    expect(itemCommentSort('added', 'desc').api).toBe('oldest');
  });

  it('should never flip a sort the API only serves one way', () => {
    expect(itemCommentSort('replies', 'desc')).toEqual({
      by: 'replies',
      how: 'asc',
      reversible: false,
      api: 'replies',
    });
  });
});

describe('itemCommentsHref', () => {
  it('should leave the default sort and direction out', () => {
    expect(itemCommentsHref('/movies/fight-club-1999', 'likes', 'asc')).toBe('/movies/fight-club-1999/comments');
    expect(itemCommentsHref('/shows/breaking-bad', 'added', 'desc')).toBe(
      '/shows/breaking-bad/comments/added?sort_how=desc',
    );
  });
});
