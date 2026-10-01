import { progressPercent } from '../../components/media/progressPercent.ts';
import type { ProgressItem } from './ProgressItem.ts';
import type { ProgressTotals } from './ProgressTotals.ts';

/** Sums every listed show's aired, completed and time left, as OG's overall stats did. */
export function sumProgressTotals(items: readonly ProgressItem[]): ProgressTotals {
  const sum = items.reduce(
    (all, item) => ({
      aired: all.aired + item.aired,
      completed: all.completed + item.completed,
      left: all.left + Math.max(item.aired - item.completed, 0),
      minutesLeft: all.minutesLeft + item.minutesLeft,
      exact: all.exact && item.exact,
    }),
    { aired: 0, completed: 0, left: 0, minutesLeft: 0, exact: true },
  );

  return { ...sum, percent: progressPercent(sum) };
}
