import type { ProfileUser } from '../users/ProfileUser.ts';
import type { ListSort } from './resolveListSort.ts';
import type { ListView } from './toListView.ts';

export type BuiltInListKind = 'watchlist' | 'favorites';

type BuiltInListViewParams = {
  kind: BuiltInListKind;
  profile: Pick<ProfileUser, 'slug' | 'isPrivate'>;
  /** From `X-List-ID` on the list's comments, or null when the worker left it out. */
  id: number | null;
  /** From `X-Pagination-Item-Count` on the list's comments. */
  commentCount: number;
  /** From `X-Pagination-Item-Count` on the items. */
  itemCount: number;
  /** From `X-Sort-By` and `X-Sort-How` on the items. */
  sort: ListSort;
};

/**
 * The watchlist or favorites as a list page's list. The API has no read for either
 * list object, so og supplies its classic names, no likes, the watchlist unranked and favorites ranked. Comments are on
 * when the list has any, since OG only linked them when they were allowed.
 */
export function toBuiltInListView(
  { kind, profile, id, commentCount, itemCount, sort }: BuiltInListViewParams,
): ListView {
  return {
    id: id ?? 0,
    slug: kind,
    name: kind === 'watchlist' ? 'Watchlist' : 'Favorites',
    href: `/users/${profile.slug}/${kind}`,
    kind,
    ownerSlug: profile.slug,
    pills: [],
    shareLink: false,
    isPublic: !profile.isPrivate,
    displayNumbers: kind === 'favorites',
    allowComments: commentCount > 0,
    itemCount,
    likeCount: 0,
    commentCount,
    sort,
  };
}
