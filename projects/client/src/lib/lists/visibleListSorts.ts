import { type ListItemSort, listItemSorts, type ListItemType } from './listItemSorts.ts';

type VisibleListSortsParams = {
  /** The chosen types. Empty is All Types. */
  types: readonly ListItemType[];
  vip: boolean;
  signedIn: boolean;
};

/**
 * The sort menu the viewer sees: VIP sorts for VIPs only, sorts that don't apply
 * to any chosen type left out, and "Your data" only when signed in.
 */
export function visibleListSorts({ types, vip, signedIn }: VisibleListSortsParams): readonly ListItemSort[] {
  return listItemSorts
    .filter((sort) => vip || !sort.vip)
    .filter((sort) => !sort.types || types.length === 0 || types.some((type) => sort.types?.includes(type)))
    .filter((sort) => signedIn || sort.group !== 'mine');
}
