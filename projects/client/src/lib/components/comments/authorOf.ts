import type { CommentResponse } from '@trakt/api';
import { toVipBadge } from '../../users/toVipBadge.ts';
import type { VipBadge } from '../../users/VipBadge.ts';

// OG's placeholder when a member has no avatar and the API sends none (private members, deleted accounts).
export const PLACEHOLDER_AVATAR = 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png';

export type CommentAuthor = {
  readonly name: string;
  /** Left out for deleted members, whose name isn't a link. */
  readonly href?: string;
  readonly slug?: string;
  readonly avatar: string;
  /** The VIP or Director label after the name. */
  readonly badge: VipBadge | null;
};

/** The author row's member. A deleted member shows as "Deleted". */
export function authorOf(user: CommentResponse['user']): CommentAuthor {
  const avatar = user.images?.avatar.full ?? PLACEHOLDER_AVATAR;
  if (user.deleted || !user.ids.slug) {
    return { name: 'Deleted', avatar: PLACEHOLDER_AVATAR, badge: null };
  }

  return {
    name: user.name?.trim() || user.username,
    href: `/users/${user.ids.slug}`,
    slug: user.ids.slug,
    avatar,
    badge: toVipBadge(user),
  };
}
