const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * OG's `humanize_minutes`: `1d 2h 5m`, or `1 day, 2 hours, 5 mins` long. Zero units are dropped, except minutes when
 * nothing else shows.
 */
export function formatRuntime(minutes: number | null | undefined, { short = true }: { short?: boolean } = {}): string {
  const total = Math.max(0, Math.floor(minutes ?? 0));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;

  const units = [
    { count: days, short: 'd', long: 'day' },
    { count: hours, short: 'h', long: 'hour' },
    { count: mins, short: 'm', long: 'min' },
  ].filter(({ count, long }) => count > 0 || (long === 'min' && days === 0 && hours === 0));

  return units
    .map(({ count, short: s, long }) => (short ? `${count}${s}` : plural(count, long)))
    .join(short ? ' ' : ', ');
}
