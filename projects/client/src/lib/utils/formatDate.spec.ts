import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate.ts';

const DATE = '2026-09-29T19:05:00.000Z';
const UTC = { timeZone: 'UTC' };

describe('formatDate', () => {
  it("should default to OG's ll", () => {
    expect(formatDate(DATE, UTC)).toBe('Sep 29, 2026');
  });

  it('should use UTC when no zone is provided so SSR and hydration agree', () => {
    expect(formatDate('2026-09-29T23:30:00Z', { time: true })).toBe('Sep 29, 2026 11:30 PM');
  });

  it('should format each moment token', () => {
    expect(formatDate(DATE, { ...UTC, format: 'l' })).toBe('Sep 29');
    expect(formatDate(DATE, { ...UTC, format: 'L' })).toBe('September 29');
    expect(formatDate(DATE, { ...UTC, format: 'LL' })).toBe('September 29, 2026');
    expect(formatDate(DATE, { ...UTC, format: 'dddd' })).toBe('Tuesday');
    expect(formatDate(DATE, { ...UTC, format: 'MY' })).toBe('September 2026');
    expect(formatDate(DATE, { ...UTC, format: 'my' })).toBe('Sep 2026');
  });

  it('should accept a Date', () => {
    expect(formatDate(new Date(DATE), UTC)).toBe('Sep 29, 2026');
  });

  describe('for date orders', () => {
    it('should put the day first for dmy', () => {
      expect(formatDate(DATE, { ...UTC, order: 'dmy' })).toBe('29 Sep 2026');
      expect(formatDate(DATE, { ...UTC, order: 'dmy', format: 'l' })).toBe('29 Sep');
      expect(formatDate(DATE, { ...UTC, order: 'dmy', format: 'MY' })).toBe('September 2026');
    });

    it('should put the year first for ymd and ydm', () => {
      expect(formatDate(DATE, { ...UTC, order: 'ymd', format: 'LL' })).toBe('2026 September 29');
      expect(formatDate(DATE, { ...UTC, order: 'ymd', format: 'l' })).toBe('Sep 29');
      expect(formatDate(DATE, { ...UTC, order: 'ydm' })).toBe('2026 29 Sep');
      expect(formatDate(DATE, { ...UTC, order: 'ydm', format: 'my' })).toBe('2026 Sep');
    });
  });

  describe('with time', () => {
    it('should use h:mm A by default', () => {
      expect(formatDate(DATE, { ...UTC, time: true })).toBe('Sep 29, 2026 7:05 PM');
    });

    it('should use HH:mm for 24-hour users', () => {
      expect(formatDate('2026-09-29T09:05:00Z', { ...UTC, time: true, hour24: true })).toBe('Sep 29, 2026 09:05');
      expect(formatDate('2026-09-29T00:30:00Z', { ...UTC, time: true, hour24: true })).toBe('Sep 29, 2026 00:30');
    });

    it('should convert to the given time zone', () => {
      expect(formatDate(DATE, { time: true, timeZone: 'America/New_York' })).toBe('Sep 29, 2026 3:05 PM');
      expect(formatDate('2026-09-29T23:30:00Z', { timeZone: 'Asia/Tokyo', format: 'dddd' })).toBe('Wednesday');
    });
  });
});
