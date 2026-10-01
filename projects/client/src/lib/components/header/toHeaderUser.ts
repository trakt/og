import type { HeaderUser } from './HeaderUser.ts';

/** The fields of `GET /users/settings` → `user` that the header reads. */
export type SettingsUser = {
  readonly username: string;
  readonly name?: string | null;
  readonly vip: boolean;
  readonly ids: { readonly slug: string };
  readonly images: { readonly avatar: { readonly full: string } };
};

/** OG's: the first word of the full name, or the username when there's no name. */
export function toHeaderUser(user: SettingsUser): HeaderUser {
  const displayName = user.name?.trim() || user.username;

  return {
    slug: user.ids.slug,
    firstName: displayName.split(' ')[0] ?? displayName,
    avatarUrl: user.images.avatar.full,
    isVip: user.vip,
  };
}
