import { describe, expect, it } from 'vitest';
import { commentType } from './commentType.ts';

describe('util: commentType', () => {
  it('should call top-level comments shouts or reviews', () => {
    expect(commentType({ review: false, parent_id: 0 })).toBe('Shout');
    expect(commentType({ review: true, parent_id: 0 })).toBe('Review');
  });

  it('should call replies replies, reviews or not', () => {
    expect(commentType({ review: true, parent_id: 12 })).toBe('Reply');
  });

  it('should always call list comments shouts', () => {
    expect(commentType({ review: true, parent_id: 0 }, { type: 'list', id: 1, title: 'Faves' })).toBe('Shout');
  });
});
