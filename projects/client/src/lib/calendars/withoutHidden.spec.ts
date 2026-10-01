import { describe, expect, it } from 'vitest';
import type { CalendarItem } from './calendarDays.ts';
import { withoutHidden } from './withoutHidden.ts';

const episode = (show: number, season: number) =>
  ({
    type: 'episode',
    at: '2026-09-29T21:00:00.000Z',
    show: { ids: { trakt: show } },
    episode: { season, number: 1, ids: { trakt: show * 100 + season } },
  }) as CalendarItem;

const movie = (id: number) => ({ type: 'movie', at: '2026-09-30', movie: { ids: { trakt: id } } }) as CalendarItem;

const keys = (items: readonly CalendarItem[]) =>
  items.map((
    item,
  ) => (item.type === 'movie' ? `m${item.movie.ids.trakt}` : `${item.show.ids.trakt}s${item.episode.season}`));

const items = [episode(1, 1), episode(1, 0), episode(2, 3), movie(7), movie(8)];

describe('withoutHidden', () => {
  it('should drop the shows and movies hidden from the calendar', () => {
    const hidden = { shows: new Set([2]), movies: new Set([8]) };
    expect(keys(withoutHidden(items, { hidden, hideSpecials: false }))).toEqual(['1s1', '1s0', 'm7']);
  });

  it('should drop specials only with the setting on', () => {
    const hidden = { shows: new Set<number>(), movies: new Set<number>() };
    expect(keys(withoutHidden(items, { hidden, hideSpecials: true }))).toEqual(['1s1', '2s3', 'm7', 'm8']);
  });
});
