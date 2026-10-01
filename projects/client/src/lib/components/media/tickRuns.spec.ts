import { describe, expect, it } from 'vitest';
import { tickRuns } from './tickRuns.ts';

describe('tickRuns', () => {
  it('should group consecutive episodes in the same state', () => {
    expect(tickRuns([true, true, false, true, false, false])).toEqual([
      { done: true, count: 2 },
      { done: false, count: 1 },
      { done: true, count: 1 },
      { done: false, count: 2 },
    ]);
  });

  it('should give no runs for no episodes', () => {
    expect(tickRuns([])).toEqual([]);
  });
});
