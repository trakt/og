import { describe, expect, it } from 'vitest';
import { toCalendarItems } from '../calendars/toCalendarItems.ts';
import { scheduleFixture } from './scheduleFixture.ts';
import { toScheduleDays } from './toScheduleDays.ts';
import { upcomingDays } from './upcomingDays.ts';

const TODAY = '2026-09-30';
const days = upcomingDays({
  items: toCalendarItems(scheduleFixture.rows(TODAY)),
  start: TODAY,
  timeZone: 'UTC',
  count: 5,
});
const base = {
  days,
  today: TODAY,
  datePreferences: { timeZone: 'UTC', hour24: false, order: 'mdy' as const },
  isVip: false,
  offers: scheduleFixture.offers,
  country: 'us',
};
const schedule = toScheduleDays(base);
const item = (title: string, index = 0) =>
  schedule.flatMap(({ items }) => items).filter((entry) => entry.title === title).at(index);

describe('toScheduleDays', () => {
  it('should name today and tomorrow, then the weekday', () => {
    expect(schedule.map(({ relative }) => relative)).toEqual(['Today', 'Tomorrow', 'Saturday', 'Sunday', 'Tuesday']);
  });

  it('should call a day before today yesterday', () => {
    const [day] = toScheduleDays({ ...base, today: '2026-10-01' });

    expect(day?.relative).toBe('Yesterday');
  });

  it('should write the short date in the viewer date order', () => {
    expect(schedule.at(0)?.short).toBe('Sep 30');
    expect(toScheduleDays({ ...base, datePreferences: { ...base.datePreferences, order: 'dmy' } }).at(0)?.short).toBe(
      '30 Sep',
    );
  });

  describe('for episodes', () => {
    it('should link the show and the episode, with its number', () => {
      expect(item('The Boys')).toMatchObject({
        href: '/shows/the-boys-2019',
        episode: {
          number: '5x01',
          title: 'Fifteen Inches of Sheer Dynamite',
          href: '/shows/the-boys-2019/seasons/5/episodes/1',
        },
        poster: 'https://media.trakt.tv/images/shows/000/139/960/posters/thumb/c5b8a81eba.jpg.webp',
      });
    });

    it('should label premieres and finales but not standard episodes', () => {
      expect(item('The Boys')?.label).toEqual({ label: 'Season Premiere', kind: 'season-premiere' });
      expect(item('Severance')?.label).toBeUndefined();
    });

    it('should give the air time on the network', () => {
      expect(item('Severance')).toMatchObject({ time: '2:00 pm', network: { name: 'Apple TV' } });
      expect(item('Severance')?.network?.href).toBeUndefined();
    });

    it('should use the 24-hour clock with that setting', () => {
      const [today] = toScheduleDays({ ...base, datePreferences: { ...base.datePreferences, hour24: true } });

      expect(today?.items.at(2)?.time).toBe('14:00');
    });

    it('should link the network to its popular shows for VIPs', () => {
      const [today] = toScheduleDays({ ...base, isVip: true });

      expect(today?.items.at(0)?.network?.href).toBe('/shows/popular?networks=Prime%20Video');
    });

    it('should mark a later episode of the show just above it', () => {
      expect(schedule.at(0)?.items.map(({ sameShow }) => sameShow)).toEqual([false, true, false]);
    });
  });

  describe('for movies', () => {
    it('should show the tagline instead of an episode', () => {
      const movie = item('Dune: Part Two');

      expect(movie).toMatchObject({ href: '/movies/dune-part-two-2024', tagline: 'Long live the fighters.' });
      expect(movie?.episode).toBeUndefined();
      expect(movie?.time).toBeUndefined();
    });
  });

  describe('Watch Now', () => {
    it('should only show when there are offers in the country', () => {
      expect(item('The Boys')?.watchNow?.button).toMatchObject({
        path: '/shows/139960/seasons/5/episodes/1',
        count: 1,
        cinemaOnly: false,
        country: 'us',
      });
      expect(item('Severance')?.watchNow).toBeUndefined();
    });

    it('should sell tickets when only cinemas have it', () => {
      expect(item('Dune: Part Two')?.watchNow).toMatchObject({
        title: 'Dune: Part Two',
        year: 2024,
        button: { cinemaOnly: true },
      });
    });
  });
});
