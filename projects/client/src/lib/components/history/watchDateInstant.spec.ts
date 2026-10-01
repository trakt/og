import { describe, expect, it } from 'vitest';
import { watchDateInstant } from './watchDateInstant.ts';
import { watchDateInput } from './watchDateInput.ts';

describe('watchDateInstant', () => {
  it('should use the account timezone instead of the browser timezone', () => {
    expect(watchDateInstant('2026-09-29T05:00', 'America/Los_Angeles')).toBe('2026-09-29T12:00:00.000Z');
    expect(watchDateInput(new Date('2026-09-29T12:00Z'), 'Asia/Tokyo')).toBe('2026-09-29T21:00');
  });
  it('should handle winter time and fractional offsets', () => {
    expect(watchDateInstant('2026-01-01T05:00', 'America/Los_Angeles')).toBe('2026-01-01T13:00:00.000Z');
    expect(watchDateInstant('2026-09-29T05:45', 'Asia/Kathmandu')).toBe('2026-09-29T00:00:00.000Z');
  });
  it.each(['not a date', '2026-02-30T05:00', '2026-03-08T02:30'])(
    'should reject invalid dates or DST gaps (%s)',
    (value) => {
      expect(watchDateInstant(value, 'America/Los_Angeles')).toBeNull();
    },
  );
});
