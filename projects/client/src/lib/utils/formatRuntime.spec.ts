import { describe, expect, it } from 'vitest';
import { formatRuntime } from './formatRuntime.ts';

describe('formatRuntime', () => {
  it('should format short by default', () => {
    expect(formatRuntime(45)).toBe('45m');
    expect(formatRuntime(125)).toBe('2h 5m');
    expect(formatRuntime(1565)).toBe('1d 2h 5m');
  });

  it('should drop zero units', () => {
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(1445)).toBe('1d 5m');
  });

  it('should show 0m for nothing', () => {
    expect(formatRuntime(0)).toBe('0m');
    expect(formatRuntime(null)).toBe('0m');
    expect(formatRuntime(undefined)).toBe('0m');
  });

  it('should pluralize the long form like humanize_minutes', () => {
    expect(formatRuntime(1, { short: false })).toBe('1 min');
    expect(formatRuntime(61, { short: false })).toBe('1 hour, 1 min');
    expect(formatRuntime(2 * 1440 + 3 * 60 + 5, { short: false })).toBe('2 days, 3 hours, 5 mins');
  });
});
