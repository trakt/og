import { describe, expect, it } from 'vitest';
import type { ProgressSeasonData } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';
import { toSeasonPicker } from './toSeasonPicker.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const aired = (number: number) => `2026-09-${String(number).padStart(2, '0')}T20:00:00.000Z`;

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
    at: watched ? '2026-09-29T20:00:00.000Z' : undefined,
    firstAired: aired(index + 1),
    runtime: 22,
    rating: 8.1,
  })),
  upcoming: Array.from(
    { length: upcoming },
    (_, index) => ({
      number: done.length + index + 1,
      firstAired: index === 0 ? '2027-01-14T20:00:00.000Z' : undefined,
    }),
  ),
});

const picker = (
  seasons: readonly ProgressSeasonData[],
  next?: { season: number; number: number },
  type: ProgressType = 'watched',
) => toSeasonPicker({ seasons, next, showHref: '/shows/x', type, datePreferences });

describe('toSeasonPicker', () => {
  describe('the seasons', () => {
    it('should count each season done, in progress or not aired, with its bar and summary', () => {
      const result = picker([season(1, [true, true]), season(2, [true, false, false, false]), season(3, [], 3)]);

      expect(result.seasons.map(({ name, count, complete, percent, summary }) => ({
        name,
        count,
        complete,
        percent,
        summary,
      }))).toEqual([
        { name: 'Season 1', count: '2', complete: true, percent: 100, summary: '2/2' },
        { name: 'Season 2', count: '1/4', complete: false, percent: 25, summary: '1/4 · 1h 6m left' },
        { name: 'Season 3', count: 'soon', complete: false, percent: 0, summary: '3 announced' },
      ]);
    });

    it('should name specials apart', () => {
      expect(picker([season(0, [false])]).seasons.at(0)?.name).toBe('Specials');
    });

    it('should leave the time left out on the library tab', () => {
      expect(picker([season(1, [true, false])], undefined, 'library').seasons.at(0)?.summary).toBe('1/2');
    });
  });

  describe('the selected season', () => {
    it("should open on up next's season", () => {
      expect(
        picker([season(1, [true]), season(2, [true, false]), season(3, [true])], { season: 2, number: 2 }).selected,
      )
        .toBe(2);
    });

    it('should open on the last season with anything done without an up next', () => {
      expect(picker([season(1, [true]), season(2, [true, true]), season(3, [], 2)]).selected).toBe(2);
    });

    it('should open on season 1 when nothing is done, past the specials', () => {
      expect(picker([season(0, [false]), season(1, [false]), season(2, [false])]).selected).toBe(1);
    });
  });

  describe('the tiles', () => {
    const tiles = picker([season(1, [true, false, false], 2)], { season: 1, number: 2 }).seasons.at(0)?.tiles ?? [];

    it('should map each episode to its state and second line', () => {
      expect(tiles.map(({ state, note }) => [state, note])).toEqual([
        ['watched', '✓ Sep 29'],
        ['up-next', 'up next'],
        ['not-watched', 'Sep 3, 2026'],
        ['not-aired', 'airs Jan 14, 2027'],
        ['not-aired', 'airs TBA'],
      ]);
    });

    it('should label each tile with its code, title, state and date', () => {
      expect(tiles.map(({ label }) => label)).toEqual([
        '1x01 "E1", watched Sep 29, 2026',
        '1x02 "E2", up next, aired Sep 2, 2026',
        '1x03 "E3", not watched, aired Sep 3, 2026',
        '1x04, airs Jan 14, 2027',
        '1x05, airs TBA',
      ]);
    });

    it('should read out the title, air date, runtime, rating and status', () => {
      expect(tiles.at(1)).toMatchObject({
        code: '1x02',
        href: '/shows/x/seasons/1/episodes/2',
        readout: 'E2 · Sep 2, 2026 · 22m · 81% · up next',
      });
    });

    it('should say in your library on the library tab', () => {
      const [tile] = picker([season(1, [true, false])], undefined, 'library').seasons.at(0)?.tiles ?? [];
      expect(tile?.label).toBe('1x01 "E1", in your library, added Sep 29, 2026');
    });
  });
});
