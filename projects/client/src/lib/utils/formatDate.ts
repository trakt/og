/** A user's `account.date_format` setting. */
export type DateOrder = 'mdy' | 'dmy' | 'ymd' | 'ydm';

/**
 * OG's moment tokens: `l` Sep 29, `ll` Sep 29, 2026, `L` September 29, `LL` September 29, 2026, `dddd` Tuesday,
 * `MY` September 2026, `my` Sep 2026 (shown for `mdy`).
 */
export type DateFormat = 'l' | 'll' | 'L' | 'LL' | 'dddd' | 'MY' | 'my';

export type FormatDateOptions = {
  format?: DateFormat;
  /** Appends the time, like OG's `[time]`. */
  time?: boolean;
  order?: DateOrder;
  hour24?: boolean;
  /**
   * IANA zone from layout data.datePreferences. Defaults to UTC so SSR and hydration agree when logged out.
   */
  timeZone?: string;
};

type Parts = Record<'weekday' | 'year' | 'month' | 'day' | 'hour' | 'minute' | 'dayPeriod', string>;

function parts(
  date: Date,
  { month, hour24, timeZone }: { month: 'long' | 'short'; hour24: boolean; timeZone?: string },
) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month,
    day: 'numeric',
    hour: hour24 ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: hour24 ? 'h23' : 'h12',
  });

  return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value])) as Parts;
}

function datePart(p: Parts, format: DateFormat, order: DateOrder): string {
  if (format === 'dddd') return p.weekday;
  if (format === 'MY' || format === 'my') {
    return order.startsWith('y') ? `${p.year} ${p.month}` : `${p.month} ${p.year}`;
  }

  const withYear = format === 'll' || format === 'LL';
  const dayMonth = order === 'dmy' || order === 'ydm' ? `${p.day} ${p.month}` : `${p.month} ${p.day}`;

  if (!withYear) return dayMonth;
  if (order === 'mdy') return `${dayMonth}, ${p.year}`;
  if (order === 'dmy') return `${dayMonth} ${p.year}`;
  return `${p.year} ${dayMonth}`;
}

/** Formats a date the way OG's `.format-date` spans did, with `Intl` instead of moment. */
export function formatDate(
  date: Date | string,
  { format = 'll', time = false, order = 'mdy', hour24 = false, timeZone = 'UTC' }: FormatDateOptions = {},
): string {
  const month = format === 'L' || format === 'LL' || format === 'MY' ? 'long' : 'short';
  const p = parts(new Date(date), { month, hour24, timeZone });
  const formatted = datePart(p, format, order);

  if (!time) return formatted;
  return `${formatted} ${p.hour}:${p.minute}${hour24 ? '' : ` ${p.dayPeriod}`}`;
}
