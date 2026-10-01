import type { z } from 'zod/v4';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { toProfileUser } from '../users/toProfileUser.ts';
import { formatDate } from '../utils/formatDate.ts';
import type { followRequestsSchema } from './followRequestsSchema.ts';

export function toFollowRequest(row: z.infer<typeof followRequestsSchema>[number], datePreferences: DatePreferences) {
  const user = toProfileUser(row.user);
  return {
    id: row.id,
    slug: user.slug,
    name: user.displayName,
    avatarUrl: user.avatarUrl,
    requestedAt: formatDate(row.requested_at, { ...datePreferences, time: true }),
  };
}
