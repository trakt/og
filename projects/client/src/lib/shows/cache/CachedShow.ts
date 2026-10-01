/** A show's summary as the progress page and other bulk views need it, kept per show id across visits. */
export type CachedShow = {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly year?: number;
  /** `returning series`, `ended`, `canceled` and so on. */
  readonly status?: string;
  readonly genres: readonly string[];
  /** One episode's runtime in minutes. */
  readonly runtime?: number;
  readonly totalRuntime?: number;
  readonly rating?: number;
  readonly votes?: number;
  /** Aired episodes, specials left out. */
  readonly airedEpisodes?: number;
  readonly firstAired?: string;
  readonly lastAired?: string;
  /** `extended=images` paths, for `imageUrl`. */
  readonly poster?: string;
  readonly fanart?: string;
  /** When the metadata was read, in ms. */
  readonly fetchedAt: number;
  /** The images were read too. A metadata-only response never sets it. */
  readonly complete: boolean;
};
