import { describe, expect, it } from 'vitest';
import { progressItemFixture } from './progressItemFixture.ts';
import { sumProgressTotals } from './sumProgressTotals.ts';

describe('sumProgressTotals', () => {
  it('should sum every show and floor the percent', () => {
    const totals = sumProgressTotals([
      progressItemFixture(1, { aired: 10, completed: 10, minutesLeft: 0, exact: true }),
      progressItemFixture(2, { aired: 20, completed: 5, minutesLeft: 300, exact: true }),
      progressItemFixture(3, { aired: 3, completed: 0, minutesLeft: 0, exact: true }),
    ]);

    expect(totals).toEqual({ aired: 33, completed: 15, left: 18, minutesLeft: 300, exact: true, percent: 45 });
  });

  it('should say the time left is an estimate while any show is', () => {
    expect(sumProgressTotals([progressItemFixture(1, { exact: true }), progressItemFixture(2)]).exact).toBe(false);
  });

  it('should read 0% with nothing aired', () => {
    expect(sumProgressTotals([])).toEqual({ aired: 0, completed: 0, left: 0, minutesLeft: 0, exact: true, percent: 0 });
  });
});
