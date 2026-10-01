/** The API item and its public permalink; nested season/episode URLs still report by their Trakt id. */
export interface ReportTarget {
  readonly type: 'movie' | 'show' | 'season' | 'episode' | 'person' | 'user' | 'comment' | 'list';
  readonly id: number | string;
  /** Under the dialog's heading. Comments have none. */
  readonly title: string;
  readonly href: string;
  readonly tmdb?: string;
  /** Personal list reports use the owner-scoped route. Other list kinds report by numeric id. */
  readonly ownerSlug?: string;
}
