import { describe, expect, it } from 'vitest';
import { progressFixture } from './progressFixture.ts';
import type { ProgressRowData } from './progressRowsSchema.ts';
import { toProgressRow } from './toProgressRow.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const now = new Date('2026-09-30T20:00:00.000Z');
const byTitle = (rows: readonly ProgressRowData[], title: string) => {
  const row = rows.find(({ show }) => show.title === title);
  if (!row) throw new Error(`no fixture for ${title}`);
  return row;
};
const watched = (title: string) =>
  toProgressRow({ row: byTitle(progressFixture.watched, title), type: 'watched', datePreferences, now });

describe('toProgressRow', () => {
  describe('for watched progress', () => {
    it('should map the counts, times and last watched episode', () => {
      expect(watched('Breaking Bad')).toMatchObject({
        id: 1388,
        title: 'Breaking Bad',
        href: '/shows/breaking-bad',
        percent: 55,
        aired: 20,
        completed: 11,
        left: 9,
        plays: 13,
        watchedTime: '10h 11m',
        leftTime: '7h 3m',
        last: {
          number: '2x04',
          title: '"Episode 4"',
          href: '/shows/breaking-bad/seasons/2/episodes/4',
          relative: 'a month ago',
          date: 'Sep 3, 2026 1:04 PM',
        },
        rewatchingSince: undefined,
      });
    });

    it('should draw a tick per episode across the seasons', () => {
      expect(watched('Breaking Bad').ticks).toEqual([{ done: true, count: 11 }, { done: false, count: 9 }]);
    });

    it('should map each season with its summary and episode chips', () => {
      const [first, second] = watched('Breaking Bad').seasons;

      expect(first).toMatchObject({ title: 'Season 1', percent: 100, summary: '7/7 episodes — 7 plays (5h 29m)' });
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
      expect(watched('The Wire').seasons.at(0)?.title).toBe('Season 1: The Streets');
    });

    it('should mark a rewatch with its start date', () => {
      expect(watched('Game of Thrones').rewatchingSince).toBe('July 2, 2026');
    });

    it('should say when you dropped the show, only on the Dropped tab', () => {
      const row = byTitle(progressFixture.watched, 'Severance');
      const dropped = toProgressRow({ row, type: 'watched', datePreferences, now, droppedAt: '2025-04-18T05:53:00Z' });

      // In the viewer's time zone, like OG's `allow_conversion`.
      expect(dropped.droppedOn).toBe('April 17, 2025');
      expect(watched('Severance').droppedOn).toBeUndefined();
    });

    it('should card the next episode with its premiere and air date', () => {
      expect(watched('Game of Thrones').next).toEqual({
        href: '/shows/game-of-thrones/seasons/3/episodes/1',
        title: 'Valar Dohaeris',
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
      expect(watched('The Wire').next).toMatchObject({
        href: '/shows/the-wire',
        title: 'The Wire',
        year: 2002,
        tags: [{ text: 'Ended' }],
        target: { type: 'show', id: 1421 },
      });
      expect(watched('Severance').next.tags).toEqual([{ text: 'Returns next season!' }]);
    });
  });

  describe('for library progress', () => {
    const row = toProgressRow({
      row: byTitle(progressFixture.collection, 'Breaking Bad'),
      type: 'library',
      datePreferences,
      now,
    });

    it('should use the collected dates and skip the plays', () => {
      expect(row).toMatchObject({ completed: 11, plays: 0, rewatchingSince: undefined });
      expect(row.last?.date).toBe('Sep 3, 2026 1:04 PM');
      expect(row.seasons.at(1)?.summary).toBe('4/13 episodes');
      expect(row.seasons.at(1)?.episodes.at(0)).not.toHaveProperty('plays');
      expect(row.seasons.at(1)?.episodes.at(0)).toMatchObject({
        activity: { prefix: 'Added to library on', date: 'Sep 3, 2026 1:01 PM' },
      });
    });
  });

  it('should fill from the left without seasons, and read an unknown date as such', () => {
    const base = byTitle(progressFixture.watched, 'Breaking Bad');
    const row = toProgressRow({
      row: { ...base, progress: { ...base.progress, seasons: null, last_watched_at: '1970-01-01T00:00:00.000Z' } },
      type: 'watched',
      datePreferences,
      now,
    });

    expect(row.ticks).toEqual([{ done: true, count: 11 }, { done: false, count: 9 }]);
    expect(row.last).toMatchObject({ relative: undefined, date: 'Unknown date' });
  });
});
