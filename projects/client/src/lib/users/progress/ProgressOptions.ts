/** The viewer's progress settings for the tab, as the browser computation reads them. */
export type ProgressOptions = {
  readonly includeSpecials: boolean;
  readonly includeWatchlisted: boolean;
  /** Include Library on Watched, Include Watched on Library. */
  readonly includeOther: boolean;
  readonly useLastActivity: boolean;
};
