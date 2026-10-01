/** OG's network list picker. Following (Pending) is only on your own profile. */
export const networkTypes = {
  following: 'Following',
  following_pending: 'Following (Pending)',
  followers: 'Followers',
} as const;

export type NetworkType = keyof typeof networkTypes;
