import type { z } from 'zod/v4';
import { imageUrl } from '../../utils/imageUrl.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import type { listItemsSchema } from './listItemsSchema.ts';
import type { UserListRow } from './UserListRow.ts';

type ListItem = z.infer<typeof listItemsSchema>[number];

type BuiltInRowParams = {
  kind: 'watchlist' | 'favorites';
  profile: ProfileUser;
  items: readonly ListItem[];
  itemCount: number;
};

// A season or an episode shows its show's poster, titled like OG's poster tooltips.
function poster(item: ListItem): { title?: string; image?: string } {
  const show = item.show?.title ?? '';
  if (item.type === 'movie') return { title: item.movie?.title ?? undefined, image: art(item.movie) };
  if (item.type === 'show') return { title: show || undefined, image: art(item.show) };
  if (item.type === 'season') {
    return { title: `${show} Season ${item.season?.number ?? ''}`.trim(), image: art(item.season) ?? art(item.show) };
  }
  return { title: [show, item.episode?.title].filter(Boolean).join(': ') || undefined, image: art(item.show) };
}

const art = (media: { images?: { poster?: readonly string[] | null } | null } | null | undefined) =>
  imageUrl(media?.images?.poster?.at(0), 'thumb');

/**
 * The watchlist or favorites row at the top of `/users/:id/lists`. Neither can be
 * liked, and the API has no read for their description or whether comments are on, so both are left out.
 */
export function toBuiltInRow({ kind, profile, items, itemCount }: BuiltInRowParams): UserListRow {
  const href = `/users/${profile.slug}`;
  return {
    key: kind,
    id: null,
    kind,
    href: `${href}/${kind}`,
    name: kind === 'watchlist' ? 'Watchlist' : 'Favorites',
    owner: { slug: profile.slug, name: profile.displayName, href, avatar: profile.avatarUrl, vip: profile.vip },
    posters: items.slice(0, 5).map(poster),
    itemCount,
    pills: [],
    shareLink: false,
    isPublic: false,
    updatedAt: '',
    rank: 0,
  };
}
