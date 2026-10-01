import type { VipBadge } from './VipBadge.ts';

type VipFields = {
  readonly vip?: boolean | null;
  readonly vip_ep?: boolean | null;
  readonly vip_og?: boolean | null;
  readonly vip_years?: number | null;
  readonly director?: boolean | null;
};

/** Which VIP label OG put after a user's name, from `/users/:id?extended=vip`. Staff outrank VIP. */
export function toVipBadge(user: VipFields): VipBadge | null {
  if (user.director) return { kind: 'director' };
  if (!user.vip) return null;

  const years = user.vip_years ?? 0;
  return {
    kind: 'vip',
    tag: tag(user),
    years: years > 1 ? years : null,
  };
}

function tag(user: VipFields) {
  if (user.vip_og) return { text: 'OG', title: 'Original VIP Member' } as const;
  if (user.vip_ep) return { text: 'EP', title: 'Executive Producer' } as const;
  return null;
}
