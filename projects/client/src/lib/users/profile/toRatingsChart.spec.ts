import { describe, expect, it } from 'vitest';
import { toRatingsChart } from './toRatingsChart.ts';

describe('mapper: toRatingsChart', () => {
  it('should total the ratings and average them to two places', () => {
    const chart = toRatingsChart({ '1': 1, '8': 2, '10': 1_000 });

    expect(chart.count).toBe('1,003');
    expect(chart.average).toBe('9.99');
  });

  it('should draw ten bars against OG scale and pick out the most rated', () => {
    const { bars } = toRatingsChart({ '5': 50, '10': 105 });

    expect(bars.map(({ rating }) => rating)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // ceil(105 / 10) * 11 = 121
    expect(bars.at(9)).toMatchObject({ count: 105, label: '10 — Totally Ninja!', top: true });
    expect(bars.at(9)?.height).toBeCloseTo((105 / 121) * 100);
    expect(bars.at(4)).toMatchObject({ count: 50, label: '5 — Meh', top: false });
    expect(bars.at(0)).toMatchObject({ count: 0, height: 0 });
  });

  it('should keep empty media axes with no highlighted bar', () => {
    const { bars } = toRatingsChart(undefined, { showEmpty: true });
    expect(bars).toHaveLength(10);
    expect(bars.every(({ height, top }) => height === 0 && !top)).toBe(true);
  });

  it('should leave the chart out when there are no ratings', () => {
    expect(toRatingsChart(undefined)).toEqual({ count: '0', average: '0', bars: [] });
    expect(toRatingsChart({ '3': 0 }).bars).toEqual([]);
  });
});
