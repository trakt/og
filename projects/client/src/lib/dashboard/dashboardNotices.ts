/** Account notices follow OG's UTC account dates. Welcome expires exactly seven days after signup. */
export function dashboardNotices({ joinedAt, now, isVip, listLimit }: {
  joinedAt: string;
  now: Date;
  isVip: boolean;
  listLimit: number | undefined;
}) {
  const joined = new Date(joinedAt);
  const age = now.getTime() - joined.getTime();
  const years = now.getUTCFullYear() - joined.getUTCFullYear();
  const anniversary = years > 0 && now.getUTCMonth() === joined.getUTCMonth() &&
    now.getUTCDate() === joined.getUTCDate();
  const mod100 = years % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[years % 10] ?? 'th');
  return {
    welcome: age >= 0 && age < 7 * 86_400_000,
    anniversary: anniversary ? `${years}${suffix}` : null,
    // OG's base free list limit is five. Unknown settings leave the bonus unknown rather than inventing a count.
    additionalLists: !isVip && listLimit !== undefined ? Math.max(0, listLimit - 5) : null,
  };
}
