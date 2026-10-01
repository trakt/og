import { calendarDays, type CalendarItem, dayIn } from '../calendars/calendarDays.ts';
import { viewerAirTime } from '../calendars/viewerAirTime.ts';

type UpcomingDaysParams = {
  items: readonly CalendarItem[];
  /** The first day that counts, `YYYY-MM-DD` in the viewer's zone: today, with OG's default start day. */
  start: string;
  timeZone: string;
  /** How many days with something on them. */
  count: number;
};

// Movie release dates have no time, so they stay on their own day in every zone.
const localDay = (item: CalendarItem, timeZone: string) =>
  item.type === 'movie' ? item.at.slice(0, 10) : dayIn(item.at, timeZone);

/**
 * OG's dashboard schedule: the first `count` days from `start`
 * that have anything, in the viewer's zone and with OG's US air-time shift, each in air order with every episode once.
 */
export function upcomingDays({ items, start, timeZone, count }: UpcomingDaysParams) {
  const shifted = items.map((item) => viewerAirTime(item, timeZone));
  const dates = [...new Set(shifted.map((item) => localDay(item, timeZone)))]
    .filter((date) => date >= start)
    .toSorted()
    .slice(0, count);

  return calendarDays({ dates, items: shifted, timeZone });
}
