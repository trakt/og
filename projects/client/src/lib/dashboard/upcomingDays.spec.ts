import { describe, expect, it } from 'vitest';
import { toCalendarItems } from '../calendars/toCalendarItems.ts';
import { scheduleFixture } from './scheduleFixture.ts';
import { upcomingDays } from './upcomingDays.ts';

const items = toCalendarItems(scheduleFixture.rows('2026-09-30'));
const titles = (day: { items: readonly { type: string; show?: { title: string }; movie?: { title: string } }[] }) =>
  day.items.map((item) => item.show?.title ?? item.movie?.title);

describe('upcomingDays', () => {
  it('should keep the first days that have anything, skipping empty ones', () => {
    const days = upcomingDays({ items, start: '2026-09-30', timeZone: 'UTC', count: 5 });

    expect(days.map(({ date }) => date)).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-03',
      '2026-10-04',
      '2026-10-06',
    ]);
  });

  it('should leave out days before the start', () => {
    const days = upcomingDays({ items, start: '2026-10-01', timeZone: 'UTC', count: 2 });

    expect(days.map(({ date }) => date)).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('should list each day in air order', () => {
    const [today] = upcomingDays({ items, start: '2026-09-30', timeZone: 'UTC', count: 1 });

    expect(today && titles(today)).toEqual(['The Boys', 'The Boys', 'Severance']);
  });

  it('should group episodes by the day they air in the viewer zone', () => {
    const late = toCalendarItems([{
      ...scheduleFixture.rows('2026-09-30')[0],
      first_aired: '2026-09-30T23:00:00.000Z',
      show: { title: 'Late Show', ids: { trakt: 1, slug: 'late-show' }, country: 'gb' },
    }]);

    const [day] = upcomingDays({ items: late, start: '2026-09-30', timeZone: 'Asia/Tokyo', count: 5 });

    expect(day?.date).toBe('2026-10-01');
  });

  it('should keep a movie on its release date in every zone', () => {
    const days = upcomingDays({ items, start: '2026-09-30', timeZone: 'Pacific/Kiritimati', count: 5 });

    expect(days.find(({ items }) => items.some(({ type }) => type === 'movie'))?.date).toBe('2026-10-01');
  });

  it('should move a US show to its Eastern hour for a viewer in a US zone', () => {
    const [today] = upcomingDays({ items, start: '2026-09-30', timeZone: 'America/Los_Angeles', count: 1 });

    // 12:00 UTC is 8:00 am Eastern, so 8:00 am Pacific.
    expect(today?.items.at(0)?.at).toBe('2026-09-30T15:00:00.000Z');
  });
});
