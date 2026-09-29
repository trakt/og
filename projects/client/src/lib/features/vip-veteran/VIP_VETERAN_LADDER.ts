import type { VipVeteran } from '$lib/requests/models/VipVeteran.ts';

type VipVeteranRung = {
  tier: number;
  title: VipVeteran['title'];
};

export const VIP_VETERAN_LADDER: ReadonlyArray<VipVeteranRung> = [
  { tier: 1, title: null },
  { tier: 3, title: null },
  { tier: 5, title: 'veteran' },
  { tier: 7, title: 'veteran' },
  { tier: 10, title: 'legend' },
];
