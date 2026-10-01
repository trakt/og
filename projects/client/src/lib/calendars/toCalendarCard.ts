import type { ComponentProps } from 'svelte';
import type PosterCard from '../components/media/PosterCard.svelte';
import type FanartCard from '../components/media/FanartCard.svelte';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import { airTime } from './airTime.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { toCalendarImage } from './toCalendarImage.ts';
import type { toCalendarPreferences } from './toCalendarPreferences.ts';
import type { CalendarItem } from './calendarDays.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];

/** A calendar entry as a fanart card, plus what its quick icons need. */
export type CalendarCard = Omit<ComponentProps<typeof FanartCard>, 'icons'> & {
  key: string;
  episodeBadge?: ComponentProps<typeof PosterCard>['episodeBadge'];
  tagline?: string;
  rating?: number;
  schedule?: string;
  hideTarget?: { type: 'show'; id: number; title: string };
  overlay: { type: 'episode' | 'movie'; id: number };
  collectionContext?: { show: number; number: number; episode: number };
  /** Episodes get the watch-now and "Hide this show" icons. */
  episode: boolean;
  /** An episode's show, whose watchlisting the fade and hide menu counts too. */
  show?: number;
};

type ClockPreferences = Pick<DatePreferences, 'timeZone' | 'hour24'>;

/** Maps a calendar entry onto OG's calendar fanart card, logo image type. */
export function toCalendarCard(
  item: CalendarItem,
  clock: ClockPreferences & { imageType?: ReturnType<typeof toCalendarPreferences>['imageType'] },
): CalendarCard {
  if (item.type === 'movie') {
    const { movie } = item;
    return {
      key: `movie-${movie.ids.trakt}`,
      overlay: { type: 'movie', id: movie.ids.trakt },
      episode: false,
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      year: movie.year ?? undefined,
      rating: movie.rating ?? undefined,
      tagline: movie.tagline ?? undefined,
      ...toCalendarImage(item, clock.imageType ?? 'logo'),
    };
  }

  const { show, episode } = item;
  const label = episodeType(episode);
  const tags: Tag[] = [
    ...(label ? [label] : []),
    { text: airTime(item.at, clock) },
    ...(show.network ? [{ text: show.network, kind: 'generic' as const }] : []),
  ];

  return {
    key: `episode-${episode.ids.trakt}`,
    overlay: { type: 'episode', id: episode.ids.trakt },
    collectionContext: { show: show.ids.trakt, number: episode.season, episode: episode.number },
    hideTarget: { type: 'show', id: show.ids.trakt, title: show.title },
    episode: true,
    show: show.ids.trakt,
    href: `/shows/${show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`,
    number: episodeNumber(episode, show.genres),
    title: episode.title ?? '',
    smallTitle: { text: show.title, href: `/shows/${show.ids.slug}` },
    rating: episode.rating ?? undefined,
    schedule: `${airTime(item.at, clock)}${show.network ? ` on ${show.network}` : ''}`,
    ...toCalendarImage(item, clock.imageType ?? 'logo'),
    tags,
    episodeBadge: label ? { label: label.text, kind: label.kind } : undefined,
  };
}
