/** Which logo the ratings bar shows next to an external rating. */
export type ExternalRatingLogo =
  | 'imdb'
  | 'tmdb'
  | 'tomatometer-certified'
  | 'tomatometer-fresh'
  | 'tomatometer-rotten'
  | 'audience-certified'
  | 'audience-spilled'
  | 'audience-upright'
  | 'metacritic'
  | 'justwatch';

/** One entry in the ratings bar's "other sites" group: IMDb, TMDB, Rotten Tomatoes, Metacritic, JustWatch. */
export interface ExternalRating {
  readonly logo: ExternalRatingLogo;
  /** The tooltip: the site, then what the number is on a second line. */
  readonly title: string;
  readonly href: string;
  readonly rating: string;
  /** The small line under the number. */
  readonly votes?: string;
  /** Metacritic colors its logo ring and bar by score. */
  readonly metascore?: 'high' | 'medium' | 'low';
  /** JustWatch's 30-day rank change, already signed ("+15", "-113"). */
  readonly delta?: string;
}
