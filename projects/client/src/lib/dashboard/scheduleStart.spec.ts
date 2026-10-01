import { describe, expect, it } from 'vitest';
import { scheduleStart } from './scheduleStart.ts';

// 2026-09-30 is a Wednesday.
const TODAY = '2026-09-30';

describe('scheduleStart', () => {
  it('should start today by default', () => {
    expect(scheduleStart(TODAY, 'today')).toBe(TODAY);
  });

  it('should move a few days either side', () => {
    expect(scheduleStart(TODAY, 'yesterday')).toBe('2026-09-29');
    expect(scheduleStart(TODAY, 'two_days_ago')).toBe('2026-09-28');
    expect(scheduleStart(TODAY, 'three_days_ago')).toBe('2026-09-27');
    expect(scheduleStart(TODAY, 'tomorrow')).toBe('2026-10-01');
  });

  it('should start the week on the chosen weekday, never after today', () => {
    expect(scheduleStart(TODAY, 'monday')).toBe('2026-09-28');
    expect(scheduleStart(TODAY, 'sunday')).toBe('2026-09-27');
    expect(scheduleStart(TODAY, 'wednesday')).toBe(TODAY);
    expect(scheduleStart(TODAY, 'thursday')).toBe('2026-09-24');
  });
});
