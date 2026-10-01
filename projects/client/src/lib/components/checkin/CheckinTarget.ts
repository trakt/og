/** What the check-in modal shows and sends. OG read these from the button's `item_checkin_attributes`. */
export interface CheckinTarget {
  readonly type: 'movie' | 'episode';
  readonly id: number;
  /** API's full title: "Fight Club (1999)", `Breaking Bad 1x01 "Pilot"`. Fills `[item]` and the toasts. */
  readonly fullTitle: string;
  /** The movie or show title, the heading when there's no logo. */
  readonly topTitle: string;
  readonly logo?: string;
  readonly fanart?: string;
  readonly episode?: {
    /** "1x01" */
    readonly number: string;
    readonly title: string;
    readonly firstAired?: string;
    readonly screenshot?: string;
  };
}
