import type { ComponentProps } from 'svelte';
import type EpisodeTypeBadge from './EpisodeTypeBadge.svelte';
import type { ShowProgress } from './ShowProgress.ts';

/** What an on-deck card shows: a show's next episode to watch and the progress so far. */
export type OnDeckItem = {
  readonly showId: number;
  readonly showTitle: string;
  readonly showHref: string;
  readonly episodeId: number;
  readonly seasonNumber?: number;
  readonly episode?: number;
  readonly complete?: boolean;
  readonly completionLabel?: string;
  readonly episodeHref: string;
  /** "2x05", "Special 3", or "2x03 (15)" for anime. */
  readonly episodeNumber: string;
  readonly episodeTitle?: string;
  /** The premiere or finale tag across the poster. */
  readonly episodeBadge?: ComponentProps<typeof EpisodeTypeBadge>;
  readonly poster?: string;
  /** The episode's Trakt rating, 0 to 10. */
  readonly rating?: number;
  /** Episode runtime in minutes, for the tooltip's estimates. */
  readonly runtime?: number;
  /** The viewer's progress page for this show. */
  readonly progressHref: string;
  /** The current run: the rewatch while rewatching. */
  readonly progress: ShowProgress;
  /** OG's exact progress bar: each aired episode, true when watched. Left out, the plain bar. */
  readonly ticks?: readonly boolean[];
  /** While rewatching, the whole show's progress. */
  readonly fullProgress?: ShowProgress;
  readonly rewatching: boolean;
};
