import type { CalendarDay } from './calendarDays.ts';

type Params<Day extends CalendarDay> = {
  days: readonly Day[];
  isHidden: (type: 'show' | 'movie', id: number) => boolean;
};

/** Session hides remove every episode of the parent show, while keeping all date separators. */
export function visibleCalendarDays<Day extends CalendarDay>({ days, isHidden }: Params<Day>): Day[] {
  return days.map((day) => ({
    ...day,
    items: day.items.filter((item) =>
      item.type === 'episode' ? !isHidden('show', item.show.ids.trakt) : !isHidden('movie', item.movie.ids.trakt)
    ),
  }));
}
