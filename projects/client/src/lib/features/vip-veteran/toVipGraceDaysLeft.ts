const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 14;

export function toVipGraceDaysLeft(
  graceEndsAt: Date | Nil,
  now: Date,
): number | null {
  if (!graceEndsAt) return null;

  const daysLeft = Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY_MS);
  if (daysLeft < 1 || daysLeft > WARNING_DAYS) return null;

  return daysLeft;
}
