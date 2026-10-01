/** What the header shows for the signed-in user. The layout maps it from the API user. */
export interface HeaderUser {
  readonly slug: string;
  /** OG shows the first name only. */
  readonly firstName: string;
  readonly avatarUrl: string;
  readonly isVip: boolean;
}
