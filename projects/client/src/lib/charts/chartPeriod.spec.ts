import { describe, expect, it } from 'vitest';
import { chartPeriod, chartPeriodText } from './chartPeriod.ts';

describe('chartPeriod', () => {
  it('should take the four OG periods and fall back to weekly for anything else', () => {
    expect(['daily', 'weekly', 'monthly', 'all'].map(chartPeriod)).toEqual(['daily', 'weekly', 'monthly', 'all']);
    expect([undefined, 'yearly', 'garbage', 'toString'].map(chartPeriod)).toEqual(Array(4).fill('weekly'));
  });

  it('should read like the OG under-title', () => {
    expect(chartPeriodText('weekly')).toBe('the last 7 days');
    expect(chartPeriodText('all')).toBe('all time');
  });
});
