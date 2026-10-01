import { describe, expect, it } from 'vitest';
import { calendarDays, type CalendarItem } from './calendarDays.ts';

const episode = (at: string, show: number, season: number, number: number) =>
  ({
    type: 'episode',
    at,
    show: { ids: { trakt: show } },
    episode: { season, number, ids: { trakt: number } },
  }) as CalendarItem;

const movie = (at: string, id: number) => ({ type: 'movie', at, movie: { ids: { trakt: id } } }) as CalendarItem;

const keys = (items: readonly CalendarItem[]) =>
  items.map((
    item,
  ) => (item.type === 'movie' ? `m${item.movie.ids.trakt}` : `${item.show.ids.trakt}x${item.episode.number}`));

describe('calendarDays', () => {
  it('should keep every day, empty or not', () => {
    const days = calendarDays({
      dates: ['2026-09-29', '2026-09-30'],
      items: [movie('2026-09-30', 1)],
      timeZone: 'UTC',
    });

    expect(days.map(({ date, items }) => [date, keys(items)])).toEqual([
      ['2026-09-29', []],
      ['2026-09-30', ['m1']],
    ]);
  });

  it("should group episodes by their UTC air day in OG's order", () => {
    const days = calendarDays({
      dates: ['2026-09-29'],
      items: [
        episode('2026-09-29T21:00:00.000Z', 1, 1, 2),
        episode('2026-09-29T21:00:00.000Z', 2, 1, 1),
        episode('2026-09-29T21:00:00.000Z', 1, 1, 1),
        episode('2026-09-29T02:00:00.000Z', 3, 1, 1),
        episode('2026-09-30T00:00:00.000Z', 4, 1, 1),
      ],
      timeZone: 'UTC',
    });

    expect(keys(days.at(0)?.items ?? [])).toEqual(['3x1', '2x1', '1x1', '1x2']);
  });

  it('should list a duplicated episode once', () => {
    const days = calendarDays({
      dates: ['2026-09-29'],
      items: [episode('2026-09-29T21:00:00.000Z', 1, 1, 1), episode('2026-09-29T22:00:00.000Z', 1, 1, 1)],
      timeZone: 'UTC',
    });

    expect(keys(days.at(0)?.items ?? [])).toEqual(['1x1']);
  });

  it("should move an episode to the viewer's day", () => {
    const days = calendarDays({
      dates: ['2026-09-29', '2026-09-30'],
      items: [episode('2026-09-30T01:00:00.000Z', 1, 1, 1), movie('2026-09-30', 2)],
      timeZone: 'America/Los_Angeles',
    });

    expect(days.map(({ items }) => keys(items))).toEqual([['1x1'], ['m2']]);
  });
});
