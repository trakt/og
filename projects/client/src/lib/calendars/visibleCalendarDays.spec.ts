import { describe, expect, it, vi } from 'vitest';
import { changeVisibility } from '../components/visibility/changeVisibility.ts';
import { createOverlay } from '../overlay/createOverlay.svelte.ts';
import type { CalendarDay, CalendarItem } from './calendarDays.ts';
import { visibleCalendarDays } from './visibleCalendarDays.ts';

const episode = (id: number, show: number): CalendarItem => ({
  type: 'episode',
  at: '2026-09-30T21:00:00Z',
  show: { title: `Show ${show}`, year: 2026, ids: { trakt: show, slug: `show-${show}` } },
  episode: { season: 1, number: id, title: `Episode ${id}`, ids: { trakt: id } },
});
const movie: CalendarItem = {
  type: 'movie',
  at: '2026-09-30',
  movie: { title: 'Movie', year: 2026, ids: { trakt: 1, slug: 'movie' } },
};
const days: CalendarDay[] = [
  { date: '2026-09-30', items: [episode(10, 1), episode(11, 1), episode(12, 2), movie] },
  { date: '2026-10-01', items: [episode(13, 1)] },
  { date: '2026-10-02', items: [] },
];
const storage = {
  clearExcept: () => Promise.resolve(),
  save: () => Promise.resolve(),
  load: () => Promise.resolve([]),
};

describe('visibleCalendarDays', () => {
  it('should remove every episode of a hidden show across days without hiding a movie with the same id', () => {
    const visible = visibleCalendarDays({ days, isHidden: (type, id) => type === 'show' && id === 1 });
    expect(visible.map((day) => day.items)).toEqual([[episode(12, 2), movie], [], []]);
    expect(visible.map((day) => day.date)).toEqual(days.map((day) => day.date));
    expect(days.at(0)?.items).toHaveLength(4);
  });

  it.each([true, false])(
    'should update the count and empty days optimistically and restore them on failure (%s)',
    async (success) => {
      const overlay = createOverlay({ get: () => Promise.resolve(new Response(null, { status: 503 })), storage });
      const visible = () =>
        visibleCalendarDays({ days, isHidden: (type, id) => overlay.isHidden('calendar', type, id) });
      let respond: ((response: Response) => void) | undefined;
      const result = changeVisibility({
        target: { type: 'show', id: 1, title: 'Show 1' },
        action: 'hide',
        section: 'calendar',
        overlay,
        notify: { success: vi.fn(), error: vi.fn() },
        request: () =>
          new Promise<Response>((resolve) => {
            respond = resolve;
          }),
      });
      expect(visible().reduce((count, day) => count + day.items.length, 0)).toBe(2);
      expect(visible().at(1)?.items).toEqual([]);
      respond?.(success ? Response.json({ added: { shows: 1 } }) : new Response(null, { status: 500 }));
      expect(await result).toBe(success);
      expect(visible().reduce((count, day) => count + day.items.length, 0)).toBe(success ? 2 : 5);
      expect(visible().at(1)?.items).toHaveLength(success ? 0 : 1);
      expect(overlay.isHidden('recommendations', 'show', 1)).toBe(false);
    },
  );
});
