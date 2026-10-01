import { describe, expect, it } from 'vitest';
import { compareVersions } from './compareVersions.ts';

describe('util: compareVersions', () => {
  it('should compare numerically, not as strings', () => {
    expect(compareVersions([10, 0, 0], [9, 0, 0])).toBeGreaterThan(0);
    expect(compareVersions([1, 2, 10], [1, 2, 9])).toBeGreaterThan(0);
  });

  it('should order by major, then minor, then patch', () => {
    expect(compareVersions([1, 9, 9], [2, 0, 0])).toBeLessThan(0);
    expect(compareVersions([2, 1, 0], [2, 0, 9])).toBeGreaterThan(0);
  });

  it('should return 0 for equal versions', () => {
    expect(compareVersions([3, 5, 0], [3, 5, 0])).toBe(0);
  });
});
