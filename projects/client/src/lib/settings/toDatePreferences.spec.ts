import { describe, expect, it } from 'vitest';
import { formatDate } from '../utils/formatDate.ts';
import { toDatePreferences } from './toDatePreferences.ts';

const ACCOUNT = { timezone: 'Asia/Tokyo', date_format: 'dmy', time_24hr: true };

describe('toDatePreferences', () => {
  it('should use deterministic logged-out defaults', () => {
    expect(toDatePreferences(null)).toEqual({ order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 });
    expect(toDatePreferences({ account: null, browsing: null })).toEqual(toDatePreferences(null));
  });

  it.each(['mdy', 'dmy', 'ymd', 'ydm'])('should honor the %s date order', (order) => {
    expect(toDatePreferences({ account: { ...ACCOUNT, date_format: order } }).order).toBe(order);
  });

  it.each(['0', '1', '2', '3', '4', '5', '6'])('should honor week start day %s', (day) => {
    expect(toDatePreferences({ browsing: { week_start_day: day } }).weekStartDay).toBe(Number(day));
  });

  it.each([null, undefined, '', '7', '-1', '1.5', 'Monday'])(
    'should default an invalid week start %s to Sunday',
    (day) => {
      expect(toDatePreferences({ browsing: { week_start_day: day } }).weekStartDay).toBe(0);
    },
  );

  it('should fall back for an unknown date order or time zone', () => {
    expect(toDatePreferences({ account: { ...ACCOUNT, date_format: 'unknown', timezone: 'unknown' } })).toEqual({
      order: 'mdy',
      hour24: true,
      timeZone: 'UTC',
      weekStartDay: 0,
    });
  });

  it('should feed the viewer zone, date order and 24-hour preference into date formatting', () => {
    const settings = { account: ACCOUNT, browsing: { week_start_day: '1' } };
    const preferences = toDatePreferences(settings);
    expect(formatDate('2026-09-29T23:30:00Z', { ...preferences, time: true })).toBe('30 Sep 2026 08:30');
    expect(settings).toEqual({ account: ACCOUNT, browsing: { week_start_day: '1' } });
  });

  it('should honor 12-hour time without changing another viewer preferences', () => {
    const first = toDatePreferences({ account: ACCOUNT });
    const second = toDatePreferences({ account: { ...ACCOUNT, time_24hr: false } });
    expect(formatDate('2026-09-29T23:30:00Z', { ...second, time: true })).toBe('30 Sep 2026 8:30 AM');
    expect(first.hour24).toBe(true);
  });
});
