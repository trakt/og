/** What a discover slide's poster card needs: its link, artwork, rating and quick-icon targets. */
export type SlidePosterItem = {
  readonly type: 'show' | 'movie';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  /** The poster's tooltip and the link's name: "Severance (2022)". */
  readonly fullTitle: string;
  readonly poster?: string;
  /** Out by `now`. OG hid the rating of anything unreleased or undated (`hideUnreleasedRatings`). */
  readonly released: boolean;
  readonly rating?: number;
  readonly airedEpisodes?: number;
  readonly runtime?: number;
};
