import type { VipVeteran } from '$lib/requests/models/VipVeteran.ts';
import type { ProfileResponse } from '@trakt/api';

function toTitle(title: string | Nil): VipVeteran['title'] {
  if (title === 'veteran' || title === 'legend') return title;
  return null;
}

export function mapToVipVeteran(user: ProfileResponse): VipVeteran | null {
  if (!user.vip_veteran_since || user.vip_veteran_tier == null) return null;

  return {
    since: new Date(user.vip_veteran_since),
    years: user.vip_veteran_years ?? 0,
    tier: user.vip_veteran_tier,
    title: toTitle(user.vip_veteran_title),
    graceEndsAt: user.vip_grace_ends_at
      ? new Date(user.vip_grace_ends_at)
      : null,
  };
}
