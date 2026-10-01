import type { CalendarMovieResponse, CalendarShowResponse } from '@trakt/api';

/** One calendar entry: an episode airing (`first_aired`) or a movie release (`released`). */
export type CalendarItem =
  | { type: 'episode'; at: string; show: CalendarShowResponse['show']; episode: CalendarShowResponse['episode'] }
  | { type: 'movie'; at: string; movie: CalendarMovieResponse['movie'] };

export type CalendarDay = { date: string; items: readonly CalendarItem[] };

const episodeKey = (item: CalendarItem) =>
  item.type === 'episode' ? `${item.show.ids.trakt}-${item.episode.season}-${item.episode.number}` : undefined;

const showId = (item: CalendarItem) => (item.type === 'episode' ? item.show.ids.trakt : 0);
const number = (item: CalendarItem) => (item.type === 'episode' ? item.episode.number : 0);

// OG's order: air time, then show id descending, then episode number.
const byAirOrder = (a: CalendarItem, b: CalendarItem) =>
  a.at.localeCompare(b.at) || showId(b) - showId(a) || number(a) - number(b);

type CalendarDaysParams = {
  dates: readonly string[];
  items: readonly CalendarItem[];
  /** The viewer's zone. Episodes fall on the day they air there; movie release dates have no time, so stay put. */
  timeZone: string;
};

/** `YYYY-MM-DD` of an instant in a zone. en-CA formats dates that way. */
export const dayIn = (at: string, timeZone: string) => new Date(at).toLocaleDateString('en-CA', { timeZone });

/**
 * OG's `fill_dates`: every day in the window, empty or not, with its entries in
 * air order and each episode once.
 */
export function calendarDays({ dates, items, timeZone }: CalendarDaysParams) {
  const sorted = items.toSorted(byAirOrder);
  // ponytail: O(n²) dedupe; the biggest calendar week is a few hundred entries.
  const unique = sorted.filter((item, i) => {
    const key = episodeKey(item);
    return !key || sorted.findIndex((other) => episodeKey(other) === key) === i;
  });
  const day = (item: CalendarItem) => (item.type === 'movie' ? item.at.slice(0, 10) : dayIn(item.at, timeZone));

  return dates.map((date): CalendarDay => ({ date, items: unique.filter((item) => day(item) === date) }));
}
