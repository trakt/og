import { describe, expect, it } from 'vitest';
import { progressPercent } from './progressPercent.ts';

describe('progressPercent', () => {
  it('should floor, so only a finished show reads 100%', () => {
    expect(progressPercent({ aired: 1000, completed: 999 })).toBe(99);
    expect(progressPercent({ aired: 3, completed: 3 })).toBe(100);
  });

  it('should read 0% for a show with nothing aired', () => {
    expect(progressPercent({ aired: 0, completed: 0 })).toBe(0);
  });
});
