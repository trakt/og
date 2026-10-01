import type { z } from 'zod/v4';
import { toListRow } from '../../lists/toListRow.ts';
import { toVipBadge } from '../toVipBadge.ts';
import type { listRowsSchema } from './listRowsSchema.ts';
import type { UserListRow } from './UserListRow.ts';

/** A list from `/users/:id/lists` (the typed contract) or `/users/:id/lists/collaborations` (parsed). */
type ListSource = z.infer<typeof listRowsSchema>[number];

/** One list as a lists index row. `rank` is its 1-based place in the order the API sent. */
export function toUserListRow(list: ListSource, rank: number): UserListRow {
  const row = toListRow(list);

  return {
    ...row,
    owner: { ...row.owner, vip: toVipBadge(list.user) },
    shareLink: list.privacy === 'link',
    isPublic: list.privacy === 'public',
    updatedAt: list.updated_at,
    rank,
  };
}
