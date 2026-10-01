type Unit = 'minute' | 'hour' | 'day' | 'month' | 'year';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

// moment's `fromNow` thresholds, which OG's `.relative-date` spans used. Months and years are moment's 30.4 and 365 days.
function phrase(seconds: number): [number, Unit] | 'a few seconds' {
  if (seconds < 45) return 'a few seconds';
  if (seconds < 90) return [1, 'minute'];
  if (seconds < 45 * MINUTE) return [Math.round(seconds / MINUTE), 'minute'];
  if (seconds < 90 * MINUTE) return [1, 'hour'];
  if (seconds < 22 * HOUR) return [Math.round(seconds / HOUR), 'hour'];
  if (seconds < 36 * HOUR) return [1, 'day'];
  if (seconds < 26 * DAY) return [Math.round(seconds / DAY), 'day'];
  if (seconds < 45 * DAY) return [1, 'month'];
  if (seconds < 320 * DAY) return [Math.round(seconds / (30.4 * DAY)), 'month'];
  if (seconds < 548 * DAY) return [1, 'year'];
  return [Math.round(seconds / (365 * DAY)), 'year'];
}

/** "3 hours ago", "in 2 days", "a minute ago": moment's `fromNow`, built on `Intl.RelativeTimeFormat`. */
export function relativeDate(date: Date | string, now: Date = new Date()): string {
  const diff = (new Date(date).getTime() - now.getTime()) / 1000;
  const result = phrase(Math.abs(diff));
  const sign = diff < 0 ? -1 : 1;

  if (result === 'a few seconds') return diff < 0 ? 'a few seconds ago' : 'in a few seconds';

  const [count, unit] = result;
  const text = rtf.format(sign * count, unit);
  if (count !== 1) return text;
  return text.replace(/\b1 /, unit === 'hour' ? 'an ' : 'a ');
}
