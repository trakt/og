/** Identifies an item for rating writes; the same target can be used on a summary or a card. */
export interface RatingTarget {
  readonly type: 'movie' | 'show' | 'season' | 'episode';
  readonly id: number;
  readonly title: string;
}
