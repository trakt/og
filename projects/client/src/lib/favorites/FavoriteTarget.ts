/** Favorites belong to movies and shows; a season/episode star receives its parent show. */
export type FavoriteTarget = {
  readonly type: 'movie' | 'show';
  readonly id: number;
  readonly title: string;
  readonly year?: number | null;
  readonly fanart?: string;
};
