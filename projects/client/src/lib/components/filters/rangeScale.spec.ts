import { describe, expect, it } from 'vitest';
import { filterRanges } from './filterRanges.ts';
import { fromPercent, linearScale, toPercent } from './rangeScale.ts';

const now = new Date('2026-09-29T12:00:00Z');

describe('util: rangeScale', () => {
  const years = filterRanges({ now }).years;

  it("should put OG's year stops where noUiSlider did", () => {
    expect(toPercent(1880, years)).toBe(0);
    expect(toPercent(1975, years)).toBe(50);
    expect(toPercent(2031, years)).toBe(100);
    expect(toPercent(1940, years)).toBeCloseTo(22.5);
  });

  it('should map track positions back to stepped values', () => {
    expect(fromPercent(50, years)).toBe(1975);
    expect(fromPercent(22.5, years)).toBe(1940);
    expect(fromPercent(-10, years)).toBe(1880);
    expect(fromPercent(120, years)).toBe(2031);
  });

  it('should round IMDb ratings to tenths', () => {
    const imdb = linearScale(0, 10, 0.1);
    expect(fromPercent(71.23, imdb)).toBe(7.1);
    expect(toPercent(7.5, imdb)).toBe(75);
  });

  it('should run anticipated years from this year to ten years out', () => {
    expect(filterRanges({ now, upcoming: true }).years.stops).toEqual([[0, 2026], [100, 2036]]);
  });
});
