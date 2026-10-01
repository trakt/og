/** One movie or show in a department tab of a person's credits grid. */
export type PersonCredit = {
  readonly type: 'movie' | 'show';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  readonly year?: number;
  readonly image?: string;
  /** The Trakt rating, 0 to 10, left out for anything unreleased (unless the viewer shows early ratings). */
  readonly rating?: number;
  /** Out by `now`, so the quick icons offer watch now. */
  readonly released: boolean;
  /** "In Production" and the like, for movies that aren't out yet. */
  readonly status?: string;
  /** Shows only: the episodes this person is credited on. */
  readonly episodeCount: number;
  /** The characters played, or the crew jobs, comma-separated. */
  readonly characters: string;
  readonly airedEpisodes?: number;
  readonly runtime?: number;
  /** What each sort compares. */
  readonly sortBy: {
    /** ISO date; undated credits sort as 3000-01-01 like OG, so they lead a newest-first grid. */
    readonly released: string;
    /** Lowercase, without a leading "the", "an" or "a". */
    readonly title: string;
    readonly percentage: number;
    readonly votes: number;
    /** Minutes: the movie's runtime, or a show's runtime times its aired episodes. */
    readonly runtime: number;
    readonly episodes: number;
  };
};
