import type { z } from 'zod/v4';
import type { profileResponseSchema } from '../../users/profileResponseSchema.ts';
import { toSearchUserCard } from '../../search/toSearchUserCard.ts';
import type { SearchRow } from './toSearchRow.ts';

type SearchUser = z.infer<typeof profileResponseSchema>;

/**
 * Maps a `/search/user` user to OG's autocomplete row for it: the
 * display name, the avatar and a "User" type tag, with no year or genres. The name, link and avatar come from the
 * results page's card. Picking it records the display name under Users, like OG's `data-query` and `data-type`.
 */
export function toSearchUserRow(user: SearchUser): SearchRow {
  const card = toSearchUserCard(user);

  return {
    key: `user-${card.key}`,
    recent: { query: card.title, type: 'users', id: user.ids.trakt ?? 0 },
    href: card.href,
    title: card.title,
    type: 'User',
    poster: card.avatar,
    avatar: true,
  };
}
