import type { CalendarItem } from './calendarDays.ts';

// `TimeZoner.in_us`, as the IANA names `/users/settings` returns for those API
// zones.
const US_ZONES = new Set([
  'Pacific/Honolulu',
  'America/Juneau',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Indiana/Indianapolis',
]);
// Central and Mountain get prime time an hour earlier than the coasts.
const HOUR_EARLIER_ZONES = new Set(['America/Chicago', 'America/Denver']);
const HOUR = 3_600_000;

/** An instant's wall clock in a zone, as milliseconds since the epoch as if that wall clock were UTC. */
function wallClock(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);

  return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
}

const offset = (instant: number, timeZone: string) => wallClock(instant, timeZone) - instant;

/** The instant a wall clock reads in a zone. The second pass settles a guess that crossed a DST change. */
function fromWallClock(wall: number, timeZone: string) {
  const guess = wall - offset(wall, timeZone);
  return wall - offset(guess, timeZone);
}

/**
 * OG's `TimeZoner.convert_first_aired`: a US or Canadian show airs at the same local hour in
 * every US zone, the way networks schedule prime time, so a viewer in a US zone sees its Eastern air time on their own
 * clock (an hour earlier in Central and Mountain). OG reused the current UTC offset for every date, which put episodes
 * an hour off across a DST change; this uses each date's own offset. Other items keep their time.
 */
export function viewerAirTime(item: CalendarItem, timeZone: string): CalendarItem {
  if (item.type !== 'episode' || !US_ZONES.has(timeZone)) return item;
  if (item.show.country !== 'us' && item.show.country !== 'ca') return item;

  const eastern = wallClock(Date.parse(item.at), 'America/New_York') - (HOUR_EARLIER_ZONES.has(timeZone) ? HOUR : 0);
  return { ...item, at: new Date(fromWallClock(eastern, timeZone)).toISOString() };
}
