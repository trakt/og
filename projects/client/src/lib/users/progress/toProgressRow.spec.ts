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
        seasons: [],
        next: undefined,
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

    it('should map each season with its summary and episode chips', () => {
      const [first, second] = expanded('Breaking Bad').seasons;

      expect(first).toMatchObject({ title: 'Season 1', percent: 100, summary: '7/7 episodes — 9 plays (7h 3m)' });
      expect(second).toMatchObject({
        title: 'Season 2',
        href: '/shows/breaking-bad/seasons/2',
        percent: 30,
        summary: '4/13 episodes — 4 plays (3h 8m) — 9 remaining (7h 3m)',
      });
      expect(second?.episodes.at(0)).toEqual({
        key: '2x01',
        label: '2x01',
        href: '/shows/breaking-bad/seasons/2/episodes/1',
        done: true,
        plays: { text: '1 play', detail: '47m' },
        activity: { prefix: 'Last watched on', date: 'Sep 3, 2026 1:01 PM' },
      });
      expect(second?.episodes.at(-1)).toMatchObject({ done: false });
      expect(second?.episodes.at(-1)).not.toHaveProperty('plays');
      expect(second?.episodes.at(-1)).not.toHaveProperty('activity');
    });

    it('should add a custom season title after its number', () => {
      expect(expanded('The Wire').seasons.at(0)?.title).toBe('Season 1: The Streets');
    });

    it('should card the next episode with its premiere and air date', () => {
      expect(expanded('Game of Thrones').next).toEqual({
        href: '/shows/game-of-thrones/seasons/3/episodes/1',
        title: 'Episode 1',
        number: '3x01',
        image: undefined,
        tags: [
          { text: 'Season Premiere', kind: 'season-premiere' },
          { text: 'Sep 4, 2026 1:01 PM', kind: 'primary' },
        ],
        rating: 8.1,
        target: { type: 'episode', id: 139061, title: 'Game of Thrones 3x01' },
        season: { show: 1390, number: 3, episode: 1 },
      });
    });

    it('should card the show once nothing is left, by its status', () => {
      expect(expanded('The Wire').next).toMatchObject({
        href: '/shows/the-wire',
        title: 'The Wire',
        year: 2002,
        tags: [{ text: 'Ended' }],
        target: { type: 'show', id: 1421 },
      });
      expect(expanded('Severance').next?.tags).toEqual([{ text: 'Returns next season!' }]);
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
      expect(library.seasons.at(1)?.summary).toBe('4/13 episodes');
      expect(library.seasons.at(1)?.episodes.at(0)).not.toHaveProperty('plays');
      expect(library.seasons.at(1)?.episodes.at(0)).toMatchObject({
        activity: { prefix: 'Added to library on', date: 'Sep 3, 2026 1:01 PM' },
      });
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
