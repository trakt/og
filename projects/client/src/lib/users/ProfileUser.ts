import type { VipBadge } from './VipBadge.ts';

export type GenderIcon = 'mars' | 'venus' | 'genderless';

/** The user the `/users/:id/*` frame is about, mapped from `/users/:id?extended=full,vip`. */
export interface ProfileUser {
  readonly slug: string;
  readonly username: string;
  /** OG's `display_name`: the full name, else the username. */
  readonly displayName: string;
  /** OG's `first_name`: the first word of the display name. */
  readonly firstName: string;
  readonly avatarUrl: string;
  /** The account is private. Shows the Private label. */
  readonly isPrivate: boolean;
  /** The viewer can't see this private profile: the API only sent username, ids and the private flag. */
  readonly isLocked: boolean;
  readonly vip: VipBadge | null;
  /** OG's `display_location`: "Omicron Persei 8" when blank. */
  readonly location: string;
  readonly gender: { readonly icon: GenderIcon; readonly title: string };
  readonly age: number | null;
  /** The About Me text, as the owner typed it. */
  readonly about: string | null;
  /** The owner's VIP cover image, when they set one. */
  readonly coverUrl: string | null;
}
