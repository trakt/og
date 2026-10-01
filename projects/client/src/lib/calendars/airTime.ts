import type { DatePreferences } from '../settings/DatePreferences.ts';

type ClockPreferences = Pick<DatePreferences, 'timeZone' | 'hour24'>;

/** OG's `%l:%M %P` or, with the 24-hour setting, `%H:%M`: "9:00 pm", "21:00". */
export function airTime(at: string, { timeZone, hour24 }: ClockPreferences) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: hour24 ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: hour24 ? 'h23' : 'h12',
  }).formatToParts(new Date(at));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const time = `${part('hour')}:${part('minute')}`;

  return hour24 ? time : `${time} ${part('dayPeriod').toLowerCase()}`;
}
