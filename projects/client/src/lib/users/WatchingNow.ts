/** What the owner is checked in to or scrobbling, for the bar at the bottom of the profile cover. */
export interface WatchingNow {
  readonly action: 'checkin' | 'scrobble';
  /** The show or movie title, in bold. */
  readonly title: string;
  /** For an episode: `1x05` and its title, which OG put in quotes. */
  readonly episode: { readonly number: string; readonly title: string } | null;
  readonly href: string;
  /** The show's or movie's fanart, which replaces the cover while it plays. */
  readonly fanartUrl: string | null;
  /** OG's bar runs from `endsAt - runtime` to `endsAt`. */
  readonly endsAt: string;
  /** Minutes. */
  readonly runtime: number;
}
