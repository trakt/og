import { calendarRanges } from '../calendars/calendarRanges.ts';

/** OG looked a year ahead, or 40 days with the "All my TV shows" filter. */
const LOOKAHEAD = 365;

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * The calendar requests that cover OG's `lookahead` days from `start`, one worker-sized window each. They begin a UTC
 * day early, because a viewer east of UTC sees tonight's episodes on the calendar's previous UTC day.
 */
export function scheduleRanges(start: string, lookahead = LOOKAHEAD): { start_date: string; days: number }[] {
  return calendarRanges(addDays(start, -1), lookahead + 2);
}
