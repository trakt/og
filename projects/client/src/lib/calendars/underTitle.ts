import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import type { CalendarWindow } from './calendarWindow.ts';

type UnderTitleParams = {
  /** A public or My calendar's copy (`publicCalendars.ts`, `myCalendars.ts`). */
  calendar: { itemType: string; past: string; present: string };
  count: number;
  window: Pick<CalendarWindow, 'start' | 'end'> & { period?: CalendarWindow['period'] };
  today: string;
  datePreferences?: Pick<DatePreferences, 'order'>;
};

const longDate = (iso: string, preferences?: Pick<DatePreferences, 'order'>) =>
  formatDate(`${iso}T00:00:00Z`, { ...preferences, format: 'LL', timeZone: 'UTC' });

/**
 * OG's under-title: "**5** episodes
 * airing between September 29, 2026 and October 6, 2026." `count` is the bold part; `rest` follows it.
 */
export function underTitle({ calendar, count, window, today, datePreferences }: UnderTitleParams) {
  const itemType = count === 1 ? calendar.itemType.slice(0, -1) : calendar.itemType;
  const action = window.end < today ? calendar.past : calendar.present;
  const month = formatDate(`${window.start}T00:00:00Z`, { ...datePreferences, format: 'MY', timeZone: 'UTC' });
  const dates = window.period === 'month'
    ? `in ${month}`
    : `between ${longDate(window.start, datePreferences)} and ${longDate(window.end, datePreferences)}`;
  const rest = `${itemType} ${action} ${dates}.`;
  const shown = count.toLocaleString('en-US');

  return { count: shown, rest, sentence: `${shown} ${rest}` };
}
