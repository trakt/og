import type { GenderIcon, ProfileUser } from './ProfileUser.ts';
import { toVipBadge } from './toVipBadge.ts';

/** The fields of `GET /users/:id?extended=full,vip` the frame reads. */
export type ProfileResponse = {
  readonly username: string;
  readonly private: boolean;
  readonly name?: string | null;
  readonly vip?: boolean | null;
  readonly vip_ep?: boolean | null;
  readonly vip_og?: boolean | null;
  readonly vip_years?: number | null;
  readonly vip_cover_image?: string | null;
  readonly director?: boolean | null;
  readonly ids: { readonly slug?: string | null };
  readonly location?: string | null;
  readonly gender?: string | null;
  readonly age?: number | null;
  readonly about?: string | null;
  readonly images?: { readonly avatar: { readonly full: string } } | null;
};

const DEFAULT_LOCATION = 'Omicron Persei 8';
/** OG's `avatar_placeholder` for a user whose gender it can't see. */
const PLACEHOLDER_AVATAR = 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png';

const GENDER_ICONS: Readonly<Record<string, GenderIcon>> = { male: 'mars', female: 'venus' };

export function toProfileUser(profile: ProfileResponse): ProfileUser {
  const displayName = profile.name?.trim() || profile.username;

  return {
    slug: profile.ids.slug ?? profile.username,
    username: profile.username,
    displayName,
    firstName: displayName.split(' ').at(0) ?? displayName,
    avatarUrl: profile.images?.avatar.full ?? PLACEHOLDER_AVATAR,
    isPrivate: profile.private,
    // A private profile the viewer can't see comes back as username, ids and flags only, so `name` is missing.
    isLocked: profile.private && profile.name === undefined,
    vip: toVipBadge(profile),
    location: profile.location?.trim() || DEFAULT_LOCATION,
    gender: {
      icon: GENDER_ICONS[profile.gender ?? ''] ?? 'genderless',
      title: profile.gender ? genderTitle(profile.gender) : 'Unknown',
    },
    age: profile.age ?? null,
    about: profile.about?.trim() || null,
    coverUrl: profile.vip_cover_image || null,
  };
}

/** OG's `gender_title`: `non_binary` reads "Non-binary", anything else is title-cased. */
function genderTitle(gender: string): string {
  if (gender === 'non_binary') return 'Non-binary';

  return gender
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
