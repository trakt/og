import { describe, expect, it } from 'vitest';
import { calendarRanges } from './calendarRanges.ts';

const dayAfter = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// The worker's `days=N` runs from the start day through N days later, end inclusive (`calendarRange.ts:22-24`).
const coveredDays = ({ start_date, days }: { start_date: string; days: number }) =>
  Array.from({ length: days + 1 }, (_, i) => dayAfter(start_date, i));

describe('calendarRanges', () => {
  it('should fetch the day on a 33-day boundary once', () => {
    const covered = calendarRanges('2026-07-30', 35).flatMap(coveredDays);

    expect(covered.filter((day) => day === dayAfter('2026-07-30', 33))).toHaveLength(1);
  });

  it('should cover every requested day exactly once', () => {
    [2, 11, 33, 34, 35, 68, 69, 367].forEach((count) => {
      expect(calendarRanges('2026-07-30', count).flatMap(coveredDays)).toEqual(
        Array.from({ length: count }, (_, i) => dayAfter('2026-07-30', i)),
      );
    });
  });

  it('should never ask the worker for more than 33 days', () => {
    expect(calendarRanges('2026-07-30', 367).every(({ days }) => days <= 33)).toBe(true);
  });

  it('should ask for a week in one window', () => {
    expect(calendarRanges('2026-09-27', 11)).toEqual([{ start_date: '2026-09-27', days: 10 }]);
  });

  it('should share a 35-day month evenly, never asking for days=0', () => {
    expect(calendarRanges('2026-07-30', 35)).toEqual([
      { start_date: '2026-07-30', days: 17 },
      { start_date: '2026-08-17', days: 16 },
    ]);
  });

  it('should ask for two days rather than days=0 for a lone day', () => {
    expect(calendarRanges('2026-07-30', 1)).toEqual([{ start_date: '2026-07-30', days: 1 }]);
  });
});
