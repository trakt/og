import { formatDate, type FormatDateOptions } from '../../utils/formatDate.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

type DateOptions = Pick<FormatDateOptions, 'order' | 'hour24' | 'timeZone'>;

/**
 * The date after the labels ("Sep 28, 2026 12:23 PM"), and "updated Sep 30" when the text changed more than a day
 * after posting, with the year only when it differs.
 */
export function commentDates(
  { createdAt, updatedAt }: { createdAt: string; updatedAt: string },
  options: DateOptions = {},
): { posted: string; updated?: string } {
  const posted = formatDate(createdAt, { ...options, format: 'll', time: true });
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  if (updated.getTime() <= created.getTime() + DAY_MS) return { posted };

  const sameYear = formatDate(created, { ...options, format: 'MY' }).slice(-4) ===
    formatDate(updated, { ...options, format: 'MY' }).slice(-4);
  return { posted, updated: formatDate(updated, { ...options, format: sameYear ? 'l' : 'll' }) };
}
