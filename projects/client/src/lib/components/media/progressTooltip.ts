import { formatRuntime } from '../../utils/formatRuntime.ts';
import { progressPercent } from './progressPercent.ts';
import type { ProgressTooltipLine } from './ProgressTooltipLine.ts';
import type { ShowProgress } from './ShowProgress.ts';

type ProgressTooltipParams = {
  progress: ShowProgress;
  /** While rewatching: the show's whole progress, shown under a divider. */
  fullProgress?: ShowProgress;
  /** Episode runtime in minutes, for the estimates. */
  runtime?: number | null;
};

const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;

function lines(progress: ShowProgress, verb: string, runtime: number): readonly ProgressTooltipLine[] {
  const left = Math.max(progress.aired - progress.completed, 0);
  const watched = progress.minutesWatched || progress.plays * runtime;
  const remaining = progress.minutesLeft || left * runtime;

  return [
    { text: `${progressPercent(progress)}% ${verb}` },
    { text: `${progress.completed}/${progress.aired} ${plural(progress.aired, 'episode')}` },
    { text: `${count(progress.plays)} ${plural(progress.plays, 'play')}`, detail: formatRuntime(watched) },
    ...(remaining > 0 ? [{ text: `${count(left)} remaining`, detail: formatRuntime(remaining), muted: true }] : []),
  ];
}

/**
 * The on-deck progress bar's tooltip (`dashboard.js:7-55`), as groups of lines: "86% watched", "133/154 episodes",
 * "203 plays (3d 2h 56m)", "21 remaining (8h 43m)". A rewatch gets a second group with the whole show's progress,
 * which OG drew under a divider.
 */
export function progressTooltip({ progress, fullProgress, runtime }: ProgressTooltipParams) {
  const minutes = runtime ?? 0;
  if (!fullProgress) return [lines(progress, 'watched', minutes)];

  return [lines(progress, 'rewatched', minutes), lines(fullProgress, 'watched', minutes)];
}
