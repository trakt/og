import type { DateOrder } from '../utils/formatDate.ts';
import type { DatePreferences } from './DatePreferences.ts';
import type { ViewerSettings } from './ViewerSettings.ts';

type DateSettings = {
  readonly account?: Pick<ViewerSettings['account'], 'date_format' | 'time_24hr' | 'timezone'> | null;
  readonly browsing?: { readonly week_start_day?: string | null } | null;
};

function dateOrder(order: string | undefined): DateOrder {
  return order === 'dmy' || order === 'ymd' || order === 'ydm' ? order : 'mdy';
}

function timeZone(zone: string | undefined): string {
  if (!zone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
}

function weekStartDay(day: string | null | undefined): DatePreferences['weekStartDay'] {
  if (!day || !/^[0-6]$/.test(day)) return 0;
  return Number(day) as DatePreferences['weekStartDay'];
}

/** OG defaults to month/day/year, 12 hours and Sunday. UTC keeps logged-out SSR and hydration identical. */
export function toDatePreferences(settings: DateSettings | null): DatePreferences {
  return {
    order: dateOrder(settings?.account?.date_format),
    hour24: settings?.account?.time_24hr === true,
    timeZone: timeZone(settings?.account?.timezone),
    weekStartDay: weekStartDay(settings?.browsing?.week_start_day),
  };
}
