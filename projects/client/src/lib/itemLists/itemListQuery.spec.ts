import { describe, expect, it } from 'vitest';
import { itemListQuery, itemListsHref } from './itemListQuery.ts';

describe('itemListQuery', () => {
  it('should default to personal lists by popularity', () => {
    expect(itemListQuery(undefined, undefined)).toEqual({ type: 'personal', sortBy: 'popularity' });
  });

  it('should fall back to all lists for an unknown type, like OG', () => {
    expect(itemListQuery('likes', undefined)).toEqual({ type: 'all', sortBy: 'popularity' });
  });

  it('should fall back to popularity for the cut 30-day sorts', () => {
    expect(itemListQuery('official', 'likes_30')).toEqual({ type: 'official', sortBy: 'popularity' });
    expect(itemListQuery('favorites', 'comments')).toEqual({ type: 'favorites', sortBy: 'comments' });
  });
});

describe('itemListsHref', () => {
  it('should leave the default type and sort out', () => {
    expect(itemListsHref('/movies/fight-club-1999', { type: 'personal', sortBy: 'popularity' })).toBe(
      '/movies/fight-club-1999/lists',
    );
    expect(itemListsHref('/people/bryan-cranston', { type: 'all', sortBy: 'popularity' })).toBe(
      '/people/bryan-cranston/lists/all',
    );
  });

  it('should put the type before any other sort', () => {
    expect(itemListsHref('/shows/breaking-bad/seasons/1', { type: 'personal', sortBy: 'updated' })).toBe(
      '/shows/breaking-bad/seasons/1/lists/personal/updated',
    );
  });
});
