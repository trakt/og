/** A media item that can carry a private note. */
export type NotableItem = {
  readonly type: 'movie' | 'show' | 'season' | 'episode' | 'person';
  /** Trakt id: the note writes send it. */
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly year?: number | null;
  readonly fanart?: string;
};
