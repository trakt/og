import { describe, expect, it } from 'vitest';
import { isPlainClick } from './isPlainClick.ts';

const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe('isPlainClick', () => {
  it('should take a primary click', () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it('should leave a middle or secondary click to the browser', () => {
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
    expect(isPlainClick({ ...click, button: 2 })).toBe(false);
  });

  it('should leave a modified click to the browser', () => {
    expect(isPlainClick({ ...click, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...click, altKey: true })).toBe(false);
  });
});
