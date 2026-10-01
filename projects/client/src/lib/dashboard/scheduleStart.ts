import type { DashboardPrefs } from './dashboardPrefs.ts';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const OFFSETS: Readonly<Record<string, number>> = { yesterday: -1, two_days_ago: -2, three_days_ago: -3, tomorrow: 1 };

/**
 * The schedule's first day for OG's start day setting: today, a few days either side,
 * or a weekday, which starts the week on that day (API's `beginning_of_week`), so it's never after today.
 */
export function scheduleStart(today: string, startDay: DashboardPrefs['upcoming_start_day']): string {
  const date = new Date(`${today}T00:00:00Z`);
  const weekday = WEEKDAYS.indexOf(startDay);
  const offset = weekday >= 0 ? -((date.getUTCDay() - weekday + 7) % 7) : OFFSETS[startDay] ?? 0;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
