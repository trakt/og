/** One episode in a show's catalog. */
export type CatalogEpisode = {
  readonly id: number;
  readonly season: number;
  readonly number: number;
  readonly numberAbs?: number;
  readonly title?: string;
  readonly overview?: string;
  /** `series_premiere`, `mid_season_finale` and so on. */
  readonly type?: string;
  readonly firstAired?: string;
  readonly runtime?: number;
  readonly rating?: number;
  readonly screenshot?: string;
};

export type CatalogSeason = {
  readonly number: number;
  readonly title?: string;
  readonly episodes: readonly CatalogEpisode[];
};

/** Every season and episode of a show, specials included, from `/shows/:id/seasons?extended=full,episodes`. */
export type ShowCatalog = {
  readonly id: number;
  readonly seasons: readonly CatalogSeason[];
  /** When it was read, in ms. */
  readonly fetchedAt: number;
};
