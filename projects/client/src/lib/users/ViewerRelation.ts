/** How the signed-in viewer relates to someone else's profile. OG kept it on the page; the API needs five lists. */
export interface ViewerRelation {
  /** `following` covers friends too: OG's button read "Following" for both. */
  readonly follow: 'none' | 'pending' | 'following';
  /** The profile owner follows the viewer. */
  readonly followsYou: boolean;
  /** The viewer blocked the profile owner. */
  readonly blocked: boolean;
  /** The owner asked to follow the viewer and is waiting: the request's id. */
  readonly requestId: number | null;
}
