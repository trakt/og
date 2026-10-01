import { watchNowResponseSchema } from '@trakt/api';
import { api } from '../api/api.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { type CalendarItem, dayIn } from '../calendars/calendarDays.ts';
import { fetchCalendar } from '../calendars/fetchCalendar.ts';
import { fetchHiddenCalendar } from '../calendars/fetchHiddenCalendar.ts';
import { toCalendarPreferences } from '../calendars/toCalendarPreferences.ts';
import { withoutHidden } from '../calendars/withoutHidden.ts';
import type { Offers } from '../components/watchnow/watchNow.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import type { DashboardSettings } from './DashboardSettings.ts';
import { fetchSeasonPosters } from './fetchSeasonPosters.ts';
import type { ScheduleDay } from './ScheduleDay.ts';
import { scheduleRanges } from './scheduleRanges.ts';
import { scheduleStart } from './scheduleStart.ts';
import { scheduleWatchNowPath } from './scheduleWatchNowPath.ts';
import { toDashboardSettings } from './toDashboardSettings.ts';
import { toScheduleDays } from './toScheduleDays.ts';
import { upcomingDays } from './upcomingDays.ts';

type FetchScheduleParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  /** The layout's `/users/settings`, for "hide specials" and the watch-now country. */
  settings: ViewerSettings | null;
  datePreferences: Pick<DatePreferences, 'timeZone' | 'hour24' | 'order'>;
  isVip: boolean;
  /** The viewer's schedule settings. Left out, OG's defaults. */
  schedule?: DashboardSettings['schedule'];
  now?: Date;
};

/** OG's two wide days and three narrow ones. */
const DAYS = 5;
/** Only the wide days show posters. */
const POSTER_DAYS = 2;
/** OG's "All my TV shows" filter only looked 40 days ahead. */
const SHOWS_LOOKAHEAD = 40;

type Filter = DashboardSettings['schedule']['filter'];

// The episode calendars for each filter, with the movies on the watchlist always alongside (
// `calendar_episodes` and `calendar_movies`). My Shows & Movies already carries both.
function calendarsFor(filter: Filter) {
  if (filter === 'shows-movies' || filter === 'shows') return ['shows-movies'] as const;
  return [filter, 'movies'] as const;
}

// Watch-now routes are Official-gated and public, so no token goes with them. A failure only costs the item its link.
async function offersFor(fetch: typeof globalThis.fetch, path: string, country: string) {
  const response = await rawApiFetch({ fetch, path: `${path}/watchnow/${country}` }).catch(() => null);
  if (!response?.ok) return null;

  const parsed = watchNowResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data[country] ?? null : null;
}

async function offersByPath(fetch: typeof globalThis.fetch, items: readonly CalendarItem[], country: string) {
  const paths = [...new Set(items.map(scheduleWatchNowPath))];
  const offers = await Promise.all(paths.map((path) => offersFor(fetch, path, country)));

  return new Map(paths.flatMap((path, i): [string, Offers][] => {
    const found = offers.at(i);
    return found ? [[path, found]] : [];
  }));
}

// With the season poster setting, the wide days' episodes get their season's poster.
function seasonPosters(fetch: typeof globalThis.fetch, items: readonly CalendarItem[]) {
  const episodes = items.flatMap((item) =>
    item.type === 'episode' ? [{ showId: item.show.ids.trakt, season: item.episode.season }] : []
  );
  return fetchSeasonPosters({ fetch, episodes });
}

/**
 * The viewer's Upcoming Schedule: the first five days from the start day setting with anything on
 * the calendars its filter picks, less what they hid from the calendar and, with that setting (or the premieres filter,
 * as in OG), specials. The worker serves 34 days a request, so one request covers most viewers; only when it holds
 * fewer than five days does the rest of OG's window load, all at once. Then each shown item's Watch Now offers in the
 * viewer's country, and the season posters with that setting.
 */
export async function fetchSchedule(
  {
    fetch,
    token,
    settings,
    datePreferences,
    isVip,
    schedule = toDashboardSettings({ settings: null }).schedule,
    now = new Date(),
  }: FetchScheduleParams,
): Promise<readonly ScheduleDay[]> {
  const { timeZone } = datePreferences;
  const today = dayIn(now.toISOString(), timeZone);
  const start = scheduleStart(today, schedule.startDay);
  const client = api({ fetch, token }).calendars;
  const load = async (range: { start_date: string; days: number }) => {
    const calendars = await Promise.all(
      calendarsFor(schedule.filter).map((slug) => fetchCalendar({ client, target: 'my', slug, range, signedIn: true })),
    );
    if (calendars.includes('signed-out')) throw new Error('The schedule needs a fresh sign-in');
    return calendars.flatMap((items) => (items === 'signed-out' ? [] : items));
  };

  const [first, ...rest] = scheduleRanges(start, schedule.filter === 'shows' ? SHOWS_LOOKAHEAD : undefined);
  const [hidden, nearest] = await Promise.all([fetchHiddenCalendar({ fetch, token }), first ? load(first) : []]);
  const hideSpecials = toCalendarPreferences(settings).hideSpecials || schedule.filter === 'premieres';
  const pick = (items: readonly CalendarItem[]) =>
    upcomingDays({ items: withoutHidden(items, { hidden, hideSpecials }), start, timeZone, count: DAYS });

  const soon = pick(nearest);
  const days = soon.length < DAYS ? pick([...nearest, ...(await Promise.all(rest.map(load))).flat()]) : soon;
  const country = settings?.browsing?.watchnow?.country?.toLowerCase() || 'us';
  const [offers, seasonPoster] = await Promise.all([
    offersByPath(fetch, days.flatMap(({ items }) => items), country),
    schedule.poster === 'season'
      ? seasonPosters(fetch, days.slice(0, POSTER_DAYS).flatMap(({ items }) => items))
      : undefined,
  ]);

  return toScheduleDays({ days, today, datePreferences, isVip, offers, country, seasonPoster });
}
