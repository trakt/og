import type { CalendarItem } from './calendarDays.ts';
import type { HiddenCalendar } from './fetchHiddenCalendar.ts';

type WithoutHiddenParams = {
  hidden: HiddenCalendar;
  /** The viewer's `browsing.calendar.hide_specials` setting. */
  hideSpecials: boolean;
};

/**
 * What OG left off a signed-in viewer's calendars: the shows
 * and movies they hid from the calendar, and season 0 with the "hide specials" setting on.
 */
export function withoutHidden(items: readonly CalendarItem[], { hidden, hideSpecials }: WithoutHiddenParams) {
  return items.filter((item) =>
    item.type === 'movie'
      ? !hidden.movies.has(item.movie.ids.trakt)
      : !hidden.shows.has(item.show.ids.trakt) && !(hideSpecials && item.episode.season === 0)
  );
}
