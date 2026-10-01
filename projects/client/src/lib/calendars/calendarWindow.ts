/** A calendar window. Every date is a `YYYY-MM-DD` UTC day. */
export type CalendarWindow = {
  start: string;
  period: 'week' | 'month';
  /** Last content day, inclusive (end remains OG's weekly under-title date). */
  last: string;
  /** All display days, including empty monthly grid fillers. */
  dates: readonly string[];
  /** OG's weekly under-title endpoint (day after content), or the month's last content day. */
  end: string;
  previous: string;
  next: string;
  /**
   * The content range with two UTC days of timezone padding each side, as a first day and a count of days (not the
   * worker's end-inclusive `days`). `calendarRanges` turns it into worker requests; `calendarDays` drops entries
   * outside the displayed content period.
   */
  request: { start_date: string; days: number };
};

const DAYS = 7;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

function addDays(iso: string, days: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

// API's `date + 1.month` clamps to the month's last day: Mar 31 - 1 month is Feb 28.
function addMonths(iso: string, months: number) {
  const date = toDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toIso(date);
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toDate(value);
  return Number.isFinite(date.getTime()) && toIso(date) === value;
}

// OG's `set_params`: these words stand in for a date.
function startDate(start: string | undefined, today: string) {
  if (start === 'last' || start === 'lastweek') return addDays(today, -DAYS);
  if (start === 'next' || start === 'nextweek') return addDays(today, DAYS);
  if (start === 'lastmonth') return addMonths(today, -1);
  if (start === 'nextmonth') return addMonths(today, 1);
  if (start && isDate(start)) return start;
  return today;
}

type Preferences = { period?: 'week' | 'month'; layout?: 'list' | 'grid'; startDay?: string };
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const offsets: Readonly<Record<string, number>> = { yesterday: -1, two_days_ago: -2, three_days_ago: -3, tomorrow: 1 };
const distance = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);

/** Settings affect default weeks and every month; explicit weekly dates keep their own start. */
export function calendarWindow(
  { start, today, period = 'week', layout = 'list', startDay = 'today' }:
    & { start?: string; today: string }
    & Preferences,
): CalendarWindow {
  const requested = startDate(start, today);
  const weekday = weekdays.indexOf(startDay);
  const first = period === 'month'
    ? `${requested.slice(0, 7)}-01`
    : !start && weekday >= 0
    ? addDays(requested, -((toDate(requested).getUTCDay() - weekday + 7) % 7))
    : !start
    ? addDays(requested, offsets[startDay] ?? 0)
    : requested;
  const last = period === 'month' ? addDays(addMonths(first, 1), -1) : addDays(first, DAYS - 1);
  const padded = period === 'month' && layout === 'grid' && weekday >= 0;
  const displayStart = padded ? addDays(first, -((toDate(first).getUTCDay() - weekday + 7) % 7)) : first;
  const displayEnd = padded ? addDays(last, (weekday + 6 - toDate(last).getUTCDay() + 7) % 7) : last;

  return {
    start: first,
    period,
    last,
    dates: Array.from({ length: distance(displayStart, displayEnd) + 1 }, (_, i) => addDays(displayStart, i)),
    end: period === 'month' ? last : addDays(first, DAYS),
    previous: period === 'month' ? addMonths(first, -1) : addDays(first, -DAYS),
    next: period === 'month' ? addMonths(first, 1) : addDays(first, DAYS),
    // Fetch content days only, plus the time-zone padding.
    request: { start_date: addDays(first, -2), days: distance(first, last) + 5 },
  };
}
