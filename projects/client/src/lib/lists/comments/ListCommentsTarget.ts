/** The list a comments page is about: its header, sidebar poster and new comment target. */
export interface ListCommentsTarget {
  /** The h1 and the poster's alt: the list name, "Watchlist" or "Favorites". */
  readonly title: string;
  /** The page title after "All comments for": the list name, or "Justin's Watchlist". */
  readonly fullTitle: string;
  readonly description?: string;
  /** The list page. */
  readonly href: string;
  /** Trakt id, null when the API didn't send one. The cards' share title and the new comment need it. */
  readonly id: number | null;
  /** The list takes new comments. The API has no such flag for a watchlist or favorites. */
  readonly allowComments: boolean;
  /** The first four posters, OG's quartered list cover. */
  readonly posters: readonly { readonly title?: string; readonly image?: string }[];
}
