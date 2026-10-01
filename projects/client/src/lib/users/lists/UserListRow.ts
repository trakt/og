import type { VipBadge } from '../VipBadge.ts';

/** One row on a lists index, before the viewer's icons are worked out. */
export interface UserListRow {
  readonly key: string;
  /** The list's trakt id. Null for the watchlist and favorites, which the API doesn't serve as list objects. */
  readonly id: number | null;
  readonly kind: 'personal' | 'official' | 'watchlist' | 'favorites';
  readonly href: string;
  readonly name: string;
  readonly owner: {
    readonly slug: string;
    readonly name: string;
    readonly href: string;
    readonly avatar: string;
    readonly vip: VipBadge | null;
  };
  readonly posters: readonly { readonly title?: string; readonly image?: string }[];
  readonly itemCount: number;
  /** Left out on the watchlist and favorites. */
  readonly likeCount?: number;
  /** Left out when comments are off, or unknown (the watchlist and favorites). */
  readonly commentCount?: number;
  /** "Private", "Following" or "Official List". */
  readonly pills: readonly string[];
  /** Shared by link: the blue "Link" pill. */
  readonly shareLink: boolean;
  /** Everyone can see it, so its collaborators can be read without the viewer's token. */
  readonly isPublic: boolean;
  readonly description?: string;
  /** ISO, for the Updated Date sort. */
  readonly updatedAt: string;
  /** The owner's order, 1-based: the Rank sort and the pill over the posters. */
  readonly rank: number;
}
