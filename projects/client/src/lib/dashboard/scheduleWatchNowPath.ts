import type { CalendarItem } from '../calendars/calendarDays.ts';

/** Where a schedule item's Watch Now offers live: the episode's own, like OG's schedule, or the movie's. */
export function scheduleWatchNowPath(item: CalendarItem): string {
  if (item.type === 'movie') return `/movies/${item.movie.ids.trakt}`;

  const { show, episode } = item;
  return `/shows/${show.ids.trakt}/seasons/${episode.season}/episodes/${episode.number}`;
}
