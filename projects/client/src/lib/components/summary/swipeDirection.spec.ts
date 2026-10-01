import { describe, expect, it } from 'vitest';
import { swipeDirection } from './swipeDirection.ts';

describe('swipeDirection', () => {
  const start = { x: 150, y: 200 };
  it('should map left to next and right to previous', () => {
    expect(swipeDirection({ start, end: { x: 50, y: 210 } })).toBe('next');
    expect(swipeDirection({ start, end: { x: 250, y: 210 } })).toBe('previous');
  });
  it('should leave taps, short drags and vertical scrolling alone', () => {
    expect(swipeDirection({ start, end: { x: 150, y: 200 } })).toBeNull();
    expect(swipeDirection({ start, end: { x: 100, y: 210 } })).toBeNull();
    expect(swipeDirection({ start, end: { x: 50, y: 260 } })).toBeNull();
  });
});
