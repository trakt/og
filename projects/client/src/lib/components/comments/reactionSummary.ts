import type { ReactionsSummaryResponse } from '@trakt/api';
import { readableStat } from '../../utils/readableStat.ts';

import { reactionOptions } from './reactionOptions.ts';

export type ReactionSummary = {
  readonly reactions: readonly { readonly type: string; readonly emoji: string; readonly title: string }[];
  /** "1,234". */
  readonly total: string;
};

/** One emoji per reaction type that has any, in OG's order, then the total. */
export function reactionSummary(summary: ReactionsSummaryResponse | undefined): ReactionSummary | undefined {
  if (!summary || summary.reaction_count <= 0) return undefined;

  const reactions = reactionOptions
    .map(({ type, emoji }) => ({ type, emoji, count: summary.distribution[type] ?? 0 }))
    .filter(({ count }) => count > 0)
    .map(({ type, emoji, count }) => ({ type, emoji, title: readableStat(count) }));
  return { reactions, total: summary.reaction_count.toLocaleString('en-US') };
}
