import type { ShowProgress } from './ShowProgress.ts';

/** OG's whole-number percent: 99.6% is still "99% watched" until the last episode. */
export function progressPercent({ aired, completed }: Pick<ShowProgress, 'aired' | 'completed'>): number {
  if (aired <= 0) return 0;
  return Math.floor(Math.min(completed / aired, 1) * 100);
}
