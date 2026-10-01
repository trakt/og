import { error } from '@sveltejs/kit';
import type { api } from '../api/api.ts';
import type { CalendarItem } from './calendarDays.ts';
import type { MyCalendar } from './myCalendars.ts';
import type { PublicCalendar } from './publicCalendars.ts';
import { toCalendarItems } from './toCalendarItems.ts';

type FetchCalendarParams = {
  client: ReturnType<typeof api>['calendars'];
  /** `my` reads the token owner's calendar, so its client carries the token; `all` goes without one. */
  target: 'all' | 'my';
  slug: PublicCalendar['slug'] | MyCalendar['slug'];
  range: { start_date: string; days: number };
  /** Only picks the feed for All Shows. */
  signedIn: boolean;
  filters?: Readonly<Record<string, string>>;
};

function request({ client, target, slug, range, signedIn, filters }: FetchCalendarParams) {
  const query = { extended: 'full,images' as const, ...filters };
  const params = { target, ...range };

  switch (slug) {
    case 'shows-movies':
      return client.media({ params, query });
    case 'shows':
      // Logged out, OG kept All Shows short by listing only the shows in user 1's library
      // og's stand-in is the curated hot feed, which drops the daily talk, news and
      // soap episodes the same way.
      return target === 'all' && !signedIn
        ? client.releasesHot({ params: range, query: { ...query, type: 'show' } })
        : client.shows({ params, query });
    case 'premieres':
      return client.seasonPremieres({ params, query });
    case 'new-shows':
      return client.newShows({ params, query });
    case 'finales':
      return client.finales({ params, query });
    case 'movies':
      return client.movies({ params, query });
    case 'streaming':
      return client.streaming({ params, query });
    case 'dvd':
      return client.dvdReleases({ params, query });
  }
}

/**
 * One calendar window's entries. A 401 (a My calendar with a token that stopped working) comes back as `signed-out`
 * for the loader to send the viewer to sign in; anything else that isn't a 200 is a 502.
 */
export async function fetchCalendar(params: FetchCalendarParams): Promise<CalendarItem[] | 'signed-out'> {
  const response = await request(params);
  if (response.status === 401) return 'signed-out';
  if (response.status !== 200) error(502, 'The calendar is unavailable right now.');

  return toCalendarItems(response.body);
}
