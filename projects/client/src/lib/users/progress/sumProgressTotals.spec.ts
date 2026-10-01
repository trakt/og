import { describe, expect, it } from 'vitest';
import { sumProgressTotals } from './sumProgressTotals.ts';

describe('sumProgressTotals', () => {
  it('should sum every show and floor the percent', () => {
    const totals = sumProgressTotals([
      { progress: { aired: 10, completed: 10, stats: { minutes_left: 0 } } },
      { progress: { aired: 20, completed: 5, stats: { minutes_left: 300 } } },
      { progress: { aired: 3, completed: 0 } },
    ]);

    expect(totals).toEqual({ aired: 33, completed: 15, left: 18, minutesLeft: 300, percent: 45 });
  });

  it('should read 0% with nothing aired', () => {
    expect(sumProgressTotals([])).toEqual({ aired: 0, completed: 0, left: 0, minutesLeft: 0, percent: 0 });
  });
});
