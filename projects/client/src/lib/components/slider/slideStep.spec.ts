import { describe, expect, it } from 'vitest';
import { slideStep } from './slideStep.ts';

describe('util: slideStep', () => {
  it('should step forward and back', () => {
    expect(slideStep(3, 10, 1)).toBe(4);
    expect(slideStep(3, 10, -1)).toBe(2);
  });

  it('should wrap around at both ends', () => {
    expect(slideStep(9, 10, 1)).toBe(0);
    expect(slideStep(0, 10, -1)).toBe(9);
  });

  it("should follow OG's keys", () => {
    expect(slideStep(0, 10, 'n')).toBe(1);
    expect(slideStep(0, 10, 'ArrowRight')).toBe(1);
    expect(slideStep(1, 10, 'p')).toBe(0);
    expect(slideStep(0, 10, 'ArrowLeft')).toBe(9);
  });

  it('should leave other keys and empty sliders alone', () => {
    expect(slideStep(0, 10, 'h')).toBeUndefined();
    expect(slideStep(0, 0, 1)).toBeUndefined();
  });
});
