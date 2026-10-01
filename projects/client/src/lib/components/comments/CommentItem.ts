/**
 * What a comment is about, as far as the card needs it. The comment routes don't say, so the page that lists the
 * comments passes it: an item page knows its item, and user comment pages get it beside each comment.
 */
export type CommentItem =
  & {
    /** Trakt id of the movie, show, season, episode or list. */
    readonly id: number;
    /** The full title OG shared with the link: "Breaking Bad 1x01 \"Pilot\"". */
    readonly title: string;
  }
  & (
    | { readonly type: 'movie' | 'list' }
    /** `airedEpisodes` gives the author's and the viewer's progress. Left out, neither shows. */
    | { readonly type: 'show'; readonly airedEpisodes?: number }
    | { readonly type: 'season'; readonly show: number; readonly number: number; readonly airedEpisodes?: number }
    | { readonly type: 'episode'; readonly show: number; readonly season: number }
  );
