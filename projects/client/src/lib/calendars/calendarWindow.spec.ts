import { describe, expect, it } from 'vitest';
import { calendarWindow } from './calendarWindow.ts';

const today = '2026-09-29';

describe('calendarWindow', () => {
  it('should start today without a date', () => {
    expect(calendarWindow({ today })).toEqual({
      start: '2026-09-29',
      period: 'week',
      last: '2026-10-05',
      dates: ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
      end: '2026-10-06',
      previous: '2026-09-22',
      next: '2026-10-06',
      request: { start_date: '2026-09-27', days: 11 },
    });
  });

  it('should start on the date in the path', () => {
    expect(calendarWindow({ start: '2026-10-12', today }).start).toBe('2026-10-12');
  });

  it('should fall back to today for a date that does not parse', () => {
    expect(calendarWindow({ start: 'tomorrow', today }).start).toBe(today);
    expect(calendarWindow({ start: '2026-02-30', today }).start).toBe(today);
  });

  it.each(['2026-13-45', '2026-13-01', '0000-00-00', '2026-00-01', '2026-01-00', '2026-01-32'])(
    'should fall back to today for the impossible date %s',
    (start) => {
      expect(calendarWindow({ start, today })).toEqual(calendarWindow({ today }));
      expect(calendarWindow({ start, today, period: 'month' })).toEqual(calendarWindow({ today, period: 'month' }));
    },
  );

  it("should read OG's relative words", () => {
    expect(calendarWindow({ start: 'last', today }).start).toBe('2026-09-22');
    expect(calendarWindow({ start: 'lastweek', today }).start).toBe('2026-09-22');
    expect(calendarWindow({ start: 'next', today }).start).toBe('2026-10-06');
    expect(calendarWindow({ start: 'nextweek', today }).start).toBe('2026-10-06');
    expect(calendarWindow({ start: 'lastmonth', today }).start).toBe('2026-08-29');
    expect(calendarWindow({ start: 'nextmonth', today }).start).toBe('2026-10-29');
  });

  it('should clamp a month step to the shorter month', () => {
    expect(calendarWindow({ start: 'lastmonth', today: '2026-03-31' }).start).toBe('2026-02-28');
  });
});

describe('calendar settings windows', () => {
  it('should shift only default weeks for relative start-day settings', () => {
    for (
      const [startDay, expected] of [
        ['today', '2026-09-29'],
        ['yesterday', '2026-09-28'],
        ['two_days_ago', '2026-09-27'],
        ['three_days_ago', '2026-09-26'],
        ['tomorrow', '2026-09-30'],
      ]
    ) {
      expect(calendarWindow({ today, startDay }).start).toBe(expected);
      expect(calendarWindow({ today, startDay, start: '2026-10-10' }).start).toBe('2026-10-10');
    }
  });
  it('should start on the most recent selected weekday', () => {
    expect(calendarWindow({ today, startDay: 'monday' }).start).toBe('2026-09-28');
    expect(calendarWindow({ today, startDay: 'saturday' }).start).toBe('2026-09-26');
    expect(calendarWindow({ today, startDay: 'tuesday' }).start).toBe(today);
  });
  it('should show a full leap month and page by month', () => {
    const window = calendarWindow({ today, start: '2028-02-16', period: 'month', startDay: 'tomorrow' });
    expect(window.start).toBe('2028-02-01');
    expect(window.last).toBe('2028-02-29');
    expect(window.dates).toHaveLength(29);
    expect(window.previous).toBe('2028-01-01');
    expect(window.next).toBe('2028-03-01');
  });
  it('should pad a grid to six whole weeks without fetching the fillers', () => {
    const window = calendarWindow({ today: '2026-08-12', period: 'month', layout: 'grid', startDay: 'monday' });
    expect(window.dates).toHaveLength(42);
    expect(window.dates.at(0)).toBe('2026-07-27');
    expect(window.dates.at(-1)).toBe('2026-09-06');
    expect(window.request).toEqual({ start_date: '2026-07-30', days: 35 });
    expect(calendarWindow({ today, period: 'month', layout: 'list', startDay: 'monday' }).dates).toHaveLength(30);
  });
});
