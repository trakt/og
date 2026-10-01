import { describe, expect, it } from 'vitest';
import { progressTooltip } from './progressTooltip.ts';
import type { ProgressTooltipLine } from './ProgressTooltipLine.ts';

// Reads the lines the way OG printed them: "203 plays (3d 2h 56m)".
const asText = (groups: readonly (readonly ProgressTooltipLine[])[]) =>
  groups.map((group) => group.map(({ text, detail }) => (detail ? `${text} (${detail})` : text)));

describe('progressTooltip', () => {
  it('should list percent, episodes, plays and what is left', () => {
    const progress = { aired: 154, completed: 133, plays: 203, minutesWatched: 4496, minutesLeft: 523 };

    expect(asText(progressTooltip({ progress, runtime: 25 }))).toEqual([
      ['86% watched', '133/154 episodes', '203 plays (3d 2h 56m)', '21 remaining (8h 43m)'],
    ]);
  });

  it('should estimate missing minutes from the runtime, like OG', () => {
    const progress = { aired: 10, completed: 4, plays: 5, minutesWatched: 0, minutesLeft: null };

    expect(asText(progressTooltip({ progress, runtime: 30 }))).toEqual([
      ['40% watched', '4/10 episodes', '5 plays (2h 30m)', '6 remaining (3h)'],
    ]);
  });

  it('should drop the remaining line when nothing is left', () => {
    const progress = { aired: 1, completed: 1, plays: 1, minutesWatched: 42, minutesLeft: 0 };

    expect(asText(progressTooltip({ progress, runtime: 42 }))).toEqual([[
      '100% watched',
      '1/1 episode',
      '1 play (42m)',
    ]]);
  });

  it('should add the whole show under a rewatch', () => {
    const progress = { aired: 50, completed: 5, plays: 5, minutesWatched: 300, minutesLeft: 2700 };
    const fullProgress = { aired: 50, completed: 50, plays: 55, minutesWatched: 3300, minutesLeft: 0 };

    expect(asText(progressTooltip({ progress, fullProgress, runtime: 60 }))).toEqual([
      ['10% rewatched', '5/50 episodes', '5 plays (5h)', '45 remaining (1d 21h)'],
      ['100% watched', '50/50 episodes', '55 plays (2d 7h)'],
    ]);
  });

  it('should group thousands', () => {
    const progress = { aired: 2000, completed: 1500, plays: 1500, minutesWatched: 1, minutesLeft: 1 };

    expect(asText(progressTooltip({ progress })).at(0)).toContain('1,500 plays (1m)');
  });

  it('should put the runtimes in the detail and dim the remaining line', () => {
    const progress = { aired: 2, completed: 1, plays: 1, minutesWatched: 30, minutesLeft: 30 };

    expect(progressTooltip({ progress }).at(0)?.slice(2)).toEqual([
      { text: '1 play', detail: '30m' },
      { text: '1 remaining', detail: '30m', muted: true },
    ]);
  });
});
