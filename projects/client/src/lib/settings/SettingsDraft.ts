/**
 * What the General form edits, as the form's controls hold it: strings for selects and text,
 * booleans for checkboxes. It's mutable because the form binds to it. The later General panels add their
 * fields here and in `toSettingsPatch`.
 */
export type SettingsDraft = {
  private: boolean;
  username: string;
  /** Empty when the API didn't send it (only an allowlisted app gets `user.email`). */
  email: string;
  name: string;
  location: string;
  about: string;
  /** The birthday selects: the month and day without leading zeros, and each blank for none. */
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  displayAge: boolean;
  /** An API zone name from `railsTimeZones`, or the stored IANA zone when API has no name for it. */
  timeZone: string;
  dateFormat: string;
  time24hr: boolean;
  /** Sunday is `0`. */
  weekStartDay: string;
  /** Global. Each select holds one of its `preferenceOptions` values. */
  watchPopupAction: string;
  hideWatchingNow: boolean;
  releaseDateIgnoreRuntime: boolean;
  listPopupAction: string;
  /** Blank for "Don't automatically mark". */
  watchAfterRating: string;
  hideEpisodeTypeTags: boolean;
  otherSiteRatings: boolean;
  displayEarlyRatings: boolean;
  watchOnlyOnce: boolean;
  /** Rewatching, which the API only saves for a VIP. */
  rewatchingAdjustPercentage: boolean;
  /** Watch Now: the lowercase country code. */
  watchNowCountry: string;
  /** Every favorite service as `<country>-<source>`, like `us-netflix`. */
  watchNowFavorites: readonly string[];
  watchNowOnlyFavorites: boolean;
  /** Spoilers. */
  episodeSpoilers: string;
  showSpoilers: string;
  movieSpoilers: string;
  commentSpoilers: string;
  ratingSpoilers: string;
  actorSpoilers: string;
};
