import { airTime } from '../calendars/airTime.ts';
import type { CalendarDay, CalendarItem } from '../calendars/calendarDays.ts';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import { type Offers, toWatchNowButton } from '../components/watchnow/watchNow.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { SeasonPoster } from './fetchSeasonPosters.ts';
import type { ScheduleDay } from './ScheduleDay.ts';
import type { ScheduleItem } from './ScheduleItem.ts';
import { scheduleWatchNowPath } from './scheduleWatchNowPath.ts';

type ToScheduleDaysParams = {
  days: readonly CalendarDay[];
  /** `YYYY-MM-DD` in the viewer's zone. */
  today: string;
  datePreferences: Pick<DatePreferences, 'timeZone' | 'hour24' | 'order'>;
  /** OG linked the network to its popular shows for VIPs only. */
  isVip: boolean;
  /** Each item's offers in the viewer's country, by `scheduleWatchNowPath`. A missing one gets no Watch Now. */
  offers: ReadonlyMap<string, Offers>;
  /** The viewer's watch-now country, where the modal opens. */
  country: string;
  /** With the season poster setting, an episode's season poster. */
  seasonPoster?: SeasonPoster;
};

type Context = Omit<ToScheduleDaysParams, 'days' | 'today'>;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const noon = (date: string) => new Date(`${date}T12:00:00Z`);

// OG's `relative_day`.
function relativeDay(date: string, today: string) {
  const days = Math.round((noon(date).getTime() - noon(today).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return WEEKDAYS[noon(date).getUTCDay()] ?? '';
}

// OG's schedule only asked whether there were sources in the country.
function watchNow(item: CalendarItem, { offers, country }: Context) {
  const path = scheduleWatchNowPath(item);
  const found = offers.get(path);
  if (!found) return undefined;

  const button = toWatchNowButton({
    path,
    offers: found,
    order: null,
    sources: new Map(),
    country,
    favorites: [],
    onlyFavorites: false,
    isVip: false,
  });
  if (button.count === 0) return undefined;

  const media = item.type === 'movie' ? item.movie : item.show;
  return {
    button,
    title: media.title,
    year: media.year ?? undefined,
    fanart: imageUrl(media.images?.fanart?.at(0), 'full'),
  };
}

function toItem(item: CalendarItem, context: Context): Omit<ScheduleItem, 'sameShow'> {
  if (item.type === 'movie') {
    const { movie } = item;
    return {
      key: `movie-${movie.ids.trakt}`,
      group: `movie-${movie.ids.trakt}`,
      title: movie.title,
      href: `/movies/${movie.ids.slug}`,
      poster: imageUrl(movie.images?.poster?.at(0), 'thumb'),
      tagline: movie.tagline?.trim() || undefined,
      watchNow: watchNow(item, context),
    };
  }

  const { show, episode } = item;
  const showHref = `/shows/${show.ids.slug}`;
  const label = episodeType(episode);
  return {
    key: `episode-${episode.ids.trakt}`,
    group: `show-${show.ids.trakt}`,
    title: show.title,
    href: showHref,
    poster: context.seasonPoster?.(show.ids.trakt, episode.season) ?? imageUrl(show.images?.poster?.at(0), 'thumb'),
    episode: {
      number: episodeNumber(episode, show.genres),
      title: episode.title?.trim() || undefined,
      href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
    },
    label: label && { label: label.text, kind: label.kind },
    time: airTime(item.at, context.datePreferences),
    network: show.network
      ? {
        name: show.network,
        href: context.isVip ? `/shows/popular?networks=${encodeURIComponent(show.network)}` : undefined,
      }
      : undefined,
    watchNow: watchNow(item, context),
  };
}

/**
 * The picked days as OG's schedule columns.
 */
export function toScheduleDays({ days, today, ...context }: ToScheduleDaysParams): ScheduleDay[] {
  const { order } = context.datePreferences;

  return days.map(({ date, items }) => {
    const mapped = items.map((item) => toItem(item, context));
    return {
      date,
      relative: relativeDay(date, today),
      short: formatDate(noon(date), { format: 'l', order }),
      items: mapped.map((item, i) => ({ ...item, sameShow: i > 0 && mapped.at(i - 1)?.group === item.group })),
    };
  });
}
