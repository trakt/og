import { describe, expect, it } from 'vitest';
import { withoutBlocked } from './withoutBlocked.ts';

const by = (trakt: number) => ({ user: { ids: { trakt, slug: `u${trakt}` } } }) as const;

describe('util: withoutBlocked', () => {
  it('should drop the blocked members and keep everyone else in order', () => {
    expect(withoutBlocked([by(1), by(2), by(3), by(2)], new Set([2]))).toEqual([by(1), by(3)]);
  });

  it('should return the same list when nobody is blocked', () => {
    const comments = [by(1)];
    expect(withoutBlocked(comments, new Set())).toBe(comments);
  });
});
