import type { z } from 'zod/v4';
import type { profileResponseSchema } from '../users/profileResponseSchema.ts';
import { toProfileUser } from '../users/toProfileUser.ts';

type SearchUser = z.infer<typeof profileResponseSchema>;

/** OG's tag over a user result: staff read "Director", VIPs "VIP" or "VIP EP". */
function tag(user: SearchUser): string | null {
  if (user.director) return 'Director';
  if (!user.vip) return null;
  return user.vip_ep ? 'VIP EP' : 'VIP';
}

/**
 * Maps a `/search/user` user onto OG's avatar card: the display name, the
 * avatar and the VIP cover, which the card swaps for OG's default backdrop when it's unset.
 */
export function toSearchUserCard(user: SearchUser) {
  const profile = toProfileUser(user);
  const text = tag(user);

  return {
    key: profile.slug,
    href: `/users/${profile.slug}`,
    title: profile.displayName,
    avatar: profile.avatarUrl,
    cover: profile.coverUrl,
    tags: text ? [{ text }] : [],
  };
}
