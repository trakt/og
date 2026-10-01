import type { ComponentProps } from 'svelte';
import type EpisodeTypeBadge from '../components/media/EpisodeTypeBadge.svelte';
import type { WatchNowButton } from '../components/watchnow/watchNow.ts';

/** One entry in an Upcoming Schedule day: an episode airing or a movie out. */
export type ScheduleItem = {
  readonly key: string;
  /** `show-1388` or `movie-537449`: which poster the item shows, and whether it follows its own show. */
  readonly group: string;
  /** The show's or movie's title, the h4. */
  readonly title: string;
  readonly href: string;
  readonly poster?: string;
  /** An episode's h5: "3x04" (or "3x04 (28)" for anime) then its title. */
  readonly episode?: { readonly number: string; readonly title?: string; readonly href: string };
  /** The premiere or finale label ahead of the air time. */
  readonly label?: ComponentProps<typeof EpisodeTypeBadge>;
  /** "10:00 pm", or "22:00" with the 24-hour setting. Episodes only. */
  readonly time?: string;
  /** VIPs get it as a link to the network's popular shows. */
  readonly network?: { readonly name: string; readonly href?: string };
  /** A movie's line under its title. */
  readonly tagline?: string;
  /** A later episode of the show just above it: OG hid its show title and air time. */
  readonly sameShow: boolean;
  /** Only when there's somewhere to watch it in the viewer's country. */
  readonly watchNow?: {
    readonly button: WatchNowButton;
    readonly title: string;
    readonly year?: number;
    readonly fanart?: string;
  };
};
