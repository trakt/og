import { describe, expect, it } from 'vitest';
import { readableStat } from './readableStat.ts';

describe('util: readableStat', () => {
  it('should show numbers under 1000 as they are', () => {
    expect(readableStat(0)).toBe('0');
    expect(readableStat(1)).toBe('1');
    expect(readableStat(999)).toBe('999');
  });

  it('should keep one decimal up to 100 of a unit, like Ruby', () => {
    expect(readableStat(1000)).toBe('1.0k');
    expect(readableStat(12_468)).toBe('12.5k');
    expect(readableStat(100_000)).toBe('100.0k');
    expect(readableStat(2_400_000)).toBe('2.4m');
  });

  it('should round to whole units past 100', () => {
    expect(readableStat(150_400)).toBe('150k');
    expect(readableStat(999_999)).toBe('1000k');
    expect(readableStat(250_000_000)).toBe('250m');
  });

  it('should treat missing counts as 0', () => {
    expect(readableStat(null)).toBe('0');
    expect(readableStat(undefined)).toBe('0');
  });
});
