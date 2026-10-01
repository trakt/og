import type { ShowResponse } from '@trakt/api';
import { countryName } from '../components/summary/names.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { SlidePosterItem } from './SlidePosterItem.ts';

export type ShowcaseSlide = SlidePosterItem & {
  readonly fanart?: string;
  /** "Sundays at 8:00 PM on Paramount+": the premiere's weekday and time, then the network. */
  readonly airs?: string;
  /** "July 13, 2025 • United States • 50m". */
  readonly premiere?: string;
  /** "Crime, Drama, Science fiction". */
  readonly genres?: string;
  readonly overview?: string;
};

type ShowcaseSlideParams = {
  show: ShowResponse;
  now: Date;
  datePreferences: DatePreferences;
  /** Signed in, dates follow the viewer's time zone; signed out, the show's, as OG's `convert_date` spans did. */
  signedIn: boolean;
};

// API's sentence case on the genre names OG joined ("Science Fiction" → "Science fiction"). The API sends slugs.
const humanize = (slug: string) => {
  const words = slug.replaceAll('-', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const joined = (parts: readonly (string | undefined)[], separator: string) => {
  const present = parts.filter((part) => part !== undefined && part !== '');
  return present.length > 0 ? present.join(separator) : undefined;
};

/**
 * Maps a show on the Summer TV Shows list onto a showcase slide. The air day and
 * time are the premiere's, like OG's, and each part is left out when the show has no value for it.
 */
export function toShowcaseSlide({ show, now, datePreferences, signedIn }: ShowcaseSlideParams): ShowcaseSlide {
  const timeZone = signedIn ? datePreferences.timeZone : show.airs?.timezone ?? datePreferences.timeZone;
  const firstAired = show.first_aired ?? undefined;
  const format = (options: Parameters<typeof formatDate>[1]) =>
    firstAired ? formatDate(firstAired, { ...datePreferences, timeZone, ...options }) : undefined;

  // "Sunday 8:00 PM" → "Sundays at 8:00 PM".
  const slot = format({ format: 'dddd', time: true })?.replace(' ', 's at ');
  const network = show.network ? `on ${show.network}` : undefined;

  return {
    type: 'show',
    id: show.ids.trakt,
    href: `/shows/${show.ids.slug}`,
    title: show.title,
    fullTitle: show.year ? `${show.title} (${show.year})` : show.title,
    poster: imageUrl(show.images?.poster?.at(0), 'thumb'),
    fanart: imageUrl(show.images?.fanart?.at(0), 'full'),
    released: firstAired ? new Date(firstAired) <= now : false,
    rating: show.rating ?? undefined,
    airedEpisodes: show.aired_episodes ?? undefined,
    runtime: show.runtime ?? undefined,
    airs: slot ? joined([slot, network], ' ') : undefined,
    premiere: firstAired
      ? joined([
        format({ format: 'LL' }),
        show.country ? countryName(show.country) : undefined,
        show.runtime != null ? `${show.runtime}m` : undefined,
      ], ' • ')
      : undefined,
    genres: joined((show.genres ?? []).map(humanize), ', '),
    overview: show.overview?.trim() || undefined,
  };
}
