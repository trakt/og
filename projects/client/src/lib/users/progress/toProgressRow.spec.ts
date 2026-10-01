import { describe, expect, it } from 'vitest';
import { progressFixture } from './progressFixture.ts';
import { progressItemFixture } from './progressItemFixture.ts';
import type { ProgressItem } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';
import { toProgressRow } from './toProgressRow.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const now = new Date('2026-09-30T20:00:00.000Z');
const byTitle = (items: readonly ProgressItem[], title: string) => {
  const item = items.find(({ show }) => show.title === title);
  if (!item) throw new Error(`no fixture for ${title}`);
  return item;
};
const row = (items: readonly ProgressItem[], title: string, type: ProgressType = 'watched') =>
  toProgressRow({ item: byTitle(items, title), type, datePreferences, now });
const expanded = (title: string) => row(progressFixture.watched(true), title);
const collapsed = (title: string) => row(progressFixture.watched(false), title);

describe('toProgressRow', () => {
  describe('for a collapsed row', () => {
    it('should map the counts with estimated times and the last watched date', () => {
      expect(collapsed('Breaking Bad')).toMatchObject({
        id: 1388,
        title: 'Breaking Bad',
        href: '/shows/breaking-bad',
        percent: 55,
        aired: 20,
        completed: 11,
        left: 9,
        plays: 13,
        watchedTime: '~10h 11m',
        leftTime: '~7h 3m',
        last: { relative: 'a month ago', date: 'Sep 3, 2026 1:04 PM' },
        strips: undefined,
        upNext: undefined,
      });
      expect(collapsed('Breaking Bad').last).not.toHaveProperty('number');
    });

    it('should fill the ticks from the left', () => {
      expect(collapsed('Breaking Bad').ticks).toEqual([{ done: true, count: 11 }, { done: false, count: 9 }]);
    });
  });

  describe('for an expanded row', () => {
    it('should map the exact times and the last watched episode', () => {
      expect(expanded('Breaking Bad')).toMatchObject({
        watchedTime: '10h 11m',
        leftTime: '7h 3m',
        last: {
          number: '2x04',
          title: '"Episode 4"',
          href: '/shows/breaking-bad/seasons/2/episodes/4',
          relative: 'a month ago',
          date: 'Sep 3, 2026 1:04 PM',
        },
      });
    });

    it('should strip each season, announced episodes included', () => {
      const { strips } = expanded('Severance');

      expect(strips?.columns).toBe(10);
      expect(strips?.seasons.map(({ label, count }) => [label, count])).toEqual([
        ['S1', '9/9'],
        ['S2', '10/10'],
        ['S3', '3 announced'],
      ]);
      expect(strips?.seasons.at(2)?.cells.at(0)).toEqual({
        code: '3x01',
        href: '/shows/severance/seasons/3/episodes/1',
        state: 'not-aired',
        label: '3x01 "Episode 1", not aired',
      });
    });

    it('should banner the next episode with its premiere, air date, runtime and overview', () => {
      expect(expanded('Game of Thrones').upNext).toMatchObject({
        number: '3x01',
        title: 'Episode 1',
        href: '/shows/game-of-thrones/seasons/3/episodes/1',
        image: undefined,
        tags: [
          { text: 'Season Premiere', kind: 'season-premiere' },
          { text: 'Sep 4, 2026', kind: 'primary' },
        ],
        runtime: '55m',
        rating: 8.1,
        target: { type: 'episode', id: 139061, title: 'Game of Thrones 3x01' },
        season: { show: 1390, number: 3, episode: 1 },
      });
      expect(expanded('Game of Thrones').upNext?.overview).toMatch(/^A sample overview/);
    });

    it('should leave the banner out once every aired episode is watched', () => {
      expect(expanded('The Wire').upNext).toBeUndefined();
      expect(expanded('Severance').upNext).toBeUndefined();
    });
  });

  it('should mark a rewatch with its start date', () => {
    expect(collapsed('Game of Thrones').rewatchingSince).toBe('July 2, 2026');
  });

  it('should say when you dropped the show, only on the Dropped tab', () => {
    // In the viewer's time zone, like OG's `allow_conversion`.
    expect(row(progressFixture.dropped(false), 'Severance', 'dropped').droppedOn).toBe('April 17, 2025');
    expect(collapsed('Severance').droppedOn).toBeUndefined();
  });

  describe('for library progress', () => {
    const library = row(progressFixture.library(true), 'Breaking Bad', 'library');

    it('should use the collected dates and skip the plays', () => {
      expect(library).toMatchObject({ completed: 11, plays: 0, rewatchingSince: undefined });
      expect(library.last?.date).toBe('Sep 3, 2026 1:04 PM');
      expect(library.strips?.seasons.at(1)?.count).toBe('4/13');
      expect(library.strips?.seasons.at(1)?.cells.at(0)?.label).toBe('2x01 "Episode 1", in your library');
      expect(library.upNext).toBeUndefined();
    });
  });

  it('should read an unknown date as such', () => {
    const item = progressItemFixture(1, { lastAt: '1970-01-01T00:00:00.000Z' });
    expect(toProgressRow({ item, type: 'watched', datePreferences, now }).last).toEqual({
      relative: undefined,
      date: 'Unknown date',
    });
  });
});
