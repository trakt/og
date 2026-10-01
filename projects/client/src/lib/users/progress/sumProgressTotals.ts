import type { z } from 'zod/v4';
import { progressPercent } from '../../components/media/progressPercent.ts';
import type { ProgressTotals } from './ProgressTotals.ts';
import type { progressTotalsSchema } from './progressTotalsSchema.ts';

type Row = z.infer<typeof progressTotalsSchema>[number];

/** Sums every show's aired, completed and time left, as OG's overall stats did. */
export function sumProgressTotals(rows: readonly Row[]): ProgressTotals {
  const sum = rows.reduce(
    (all, { progress }) => ({
      aired: all.aired + progress.aired,
      completed: all.completed + progress.completed,
      left: all.left + Math.max(progress.aired - progress.completed, 0),
      minutesLeft: all.minutesLeft + (progress.stats?.minutes_left ?? 0),
    }),
    { aired: 0, completed: 0, left: 0, minutesLeft: 0 },
  );

  return { ...sum, percent: progressPercent(sum) };
}
