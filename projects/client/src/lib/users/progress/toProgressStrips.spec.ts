import { describe, expect, it } from 'vitest';
import type { ProgressSeasonData } from './ProgressItem.ts';
import { toProgressStrips } from './toProgressStrips.ts';

const season = (number: number, done: readonly boolean[], upcoming = 0): ProgressSeasonData => ({
  number,
  aired: done.length,
  completed: done.filter(Boolean).length,
  plays: 0,
  minutesWatched: 0,
  minutesLeft: done.filter((watched) => !watched).length * 22,
  episodes: done.map((watched, index) => ({
    number: index + 1,
    title: `E${index + 1}`,
    done: watched,
    plays: 0,
    minutesWatched: 0,
  })),
  upcoming: Array.from({ length: upcoming }, (_, index) => ({ number: done.length + index + 1 })),
});

const strips = (seasons: readonly ProgressSeasonData[], next?: { season: number; number: number }) =>
  toProgressStrips({ seasons, next, showHref: '/shows/x', type: 'watched' });

describe('toProgressStrips', () => {
  it('should size every row to the longest season', () => {
    const result = strips([season(1, [true, true]), season(2, Array(12).fill(false))]);

    expect(result.columns).toBe(12);
    expect(result.seasons.map(({ cells }) => cells.length)).toEqual([2, 12]);
  });

  it('should map each cell to watched, not watched, up next or not aired', () => {
    const result = strips([season(1, [true, false, false], 2)], { season: 1, number: 2 });

    expect(result.seasons.at(0)?.cells.map(({ state }) => state)).toEqual([
      'watched',
      'up-next',
      'not-watched',
      'not-aired',
      'not-aired',
    ]);
    expect(result.seasons.at(0)?.cells.at(1)?.label).toBe('1x02 "E2", up next');
    expect(result.seasons.at(0)?.cells.at(3)?.label).toBe('1x04, not aired');
  });

  it('should count a season as done, with time left, or announced', () => {
    const result = strips([season(1, [true, true]), season(2, [true, false, false]), season(3, [], 3)]);

    expect(result.seasons.map(({ count, complete }) => [count, complete])).toEqual([
      ['2/2', true],
      ['1/3 · 44m left', false],
      ['3 announced', false],
    ]);
  });

  it('should label specials apart', () => {
    expect(strips([season(0, [false])]).seasons.at(0)).toMatchObject({ label: 'SP', name: 'Specials episodes' });
  });

  it('should tick 1, every fifth column and the up-next column', () => {
    const result = strips([season(1, Array(12).fill(false))], { season: 1, number: 7 });

    expect(result.ticks.map(({ text }) => text)).toEqual(['1', '', '', '', '5', '', '▲ 7', '', '', '10', '', '']);
    expect(result.ticks.at(6)?.mark).toBe(true);
  });

  it('should leave the ruler unmarked without a next episode', () => {
    expect(strips([season(1, [true, true])]).ticks.some(({ mark }) => mark)).toBe(false);
  });
});
