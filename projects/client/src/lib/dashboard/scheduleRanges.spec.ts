import { describe, expect, it } from 'vitest';
import { scheduleRanges } from './scheduleRanges.ts';

const dayAfter = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

describe('scheduleRanges', () => {
  const ranges = scheduleRanges('2026-09-30');

  it('should start a day early for viewers east of UTC', () => {
    expect(ranges.at(0)).toEqual({ start_date: '2026-09-29', days: 33 });
  });

  it('should never ask the worker for more than 33 days', () => {
    expect(ranges.every(({ days }) => days <= 33)).toBe(true);
  });

  it('should leave no gap and no overlap, since days=N covers N + 1 days', () => {
    ranges.slice(1).forEach((range, i) => {
      const previous = ranges[i];
      expect(previous && dayAfter(previous.start_date, previous.days + 1)).toBe(range.start_date);
    });
  });

  it('should reach a year past the start, like OG', () => {
    const last = ranges.at(-1);
    expect(last && dayAfter(last.start_date, last.days)).toBe('2027-09-30');
  });
});
