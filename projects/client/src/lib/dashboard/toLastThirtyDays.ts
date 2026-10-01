import { dayIn } from '../calendars/calendarDays.ts';
import { playRuntime } from '../users/playRuntime.ts';
import { toGenreBar } from '../users/profile/toGenreBar.ts';
import type { WatchedGenreRow } from '../users/profile/watchedGenresSchema.ts';
import { countLabel } from '../utils/countLabel.ts';
import { formatRuntime } from '../utils/formatRuntime.ts';
import type { LastThirtyDays, MinutesDay, WatchedCount } from './LastThirtyDays.ts';

type Ids = { readonly ids: { readonly trakt: number }; readonly runtime?: number | null };

type EpisodeRow = { readonly watched_at: string; readonly episode: Ids; readonly show: { runtime?: number | null } };
type MovieRow = { readonly watched_at: string; readonly movie: Ids };

type ToLastThirtyDaysParams = {
  episodes: readonly EpisodeRow[];
  movies: readonly MovieRow[];
  genres: readonly WatchedGenreRow[];
  /** The history window's start, where the genre links start too. */
  start: string;
  /** The viewer's slug, for the history links. */
  slug: string;
  now: Date;
  timeZone: string;
};

type Play = {
  readonly type: 'episode' | 'movie';
  readonly id: number;
  readonly date: string;
  readonly minutes: number;
};

/** OG's `watched_minutes_per_day(30)`: today and the 29 days before it. */
const DAYS = 30;
const DAY = 86_400_000;

const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

const dayLabel = (date: string) => {
  const at = new Date(`${date}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) => at.toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
  return `${part({ weekday: 'long' })} — ${part({ month: 'short' })} ${at.getUTCDate()}`;
};

function tally(plays: readonly Play[], type: Play['type']) {
  const mine = plays.filter((play) => play.type === type);
  return { unique: new Set(mine.map(({ id }) => id)).size, plays: mine.length };
}

// The help line: "45 episodes (50 plays)".
function watchedCount(plays: readonly Play[], type: Play['type']): WatchedCount {
  const { unique, plays: count } = tally(plays, type);
  return {
    count: unique.toLocaleString('en-US'),
    word: unique === 1 ? type : `${type}s`,
    ...(count > unique && { plays: `(${countLabel(count, 'play')})` }),
  };
}

// A tooltip line, for a type played that day: "3 episodes (4 plays)".
function dayCount(plays: readonly Play[], type: Play['type']): string[] {
  const { unique, plays: count } = tally(plays, type);
  if (count === 0) return [];
  return [`${countLabel(unique, type)}${count > unique ? ` (${countLabel(count, 'play')})` : ''}`];
}

/**
 * The Last 30 Days panel from the viewer's recent plays: each play's runtime summed on its day in the viewer's zone,
 * as OG's `watched_minutes_per_day` did, the totals of those days, and the watched genres. The chart's top is the
 * busiest day rounded up to the next 10 minutes.
 */
export function toLastThirtyDays(
  { episodes, movies, genres, start, slug, now, timeZone }: ToLastThirtyDaysParams,
): LastThirtyDays {
  const today = dayIn(now.toISOString(), timeZone);
  const dates = Array.from({ length: DAYS }, (_, i) => shiftDate(today, i - DAYS + 1));
  const first = dates.at(0) ?? today;

  const plays = [
    ...episodes.map((row): Play => ({
      type: 'episode',
      id: row.episode.ids.trakt,
      date: dayIn(row.watched_at, timeZone),
      minutes: playRuntime(row),
    })),
    ...movies.map((row): Play => ({
      type: 'movie',
      id: row.movie.ids.trakt,
      date: dayIn(row.watched_at, timeZone),
      minutes: playRuntime(row),
    })),
  ].filter(({ date }) => date >= first && date <= today);

  const byDate = Map.groupBy(plays, ({ date }) => date);
  const minutesOn = (date: string) => (byDate.get(date) ?? []).reduce((sum, { minutes }) => sum + minutes, 0);
  const total = plays.reduce((sum, { minutes }) => sum + minutes, 0);
  const top = Math.ceil(Math.max(...dates.map(minutesOn)) / 10) * 10;

  const days = total > 0
    ? dates.map((date): MinutesDay => {
      const played = byDate.get(date) ?? [];
      const minutes = minutesOn(date);
      return {
        date,
        day: Number(date.slice(8)),
        minutes,
        height: (minutes / top) * 100,
        time: formatRuntime(minutes),
        label: dayLabel(date),
        counts: [...dayCount(played, 'episode'), ...dayCount(played, 'movie')],
        href: `/users/${slug}/history?${new URLSearchParams({ start_at: date, days: '1' })}`,
      };
    })
    : [];

  return {
    time: formatRuntime(total),
    episodes: watchedCount(plays, 'episode'),
    movies: watchedCount(plays, 'movie'),
    days,
    genres: genres.map((row) => toGenreBar(row, { slug, startAt: start.slice(0, 10) })),
  };
}
