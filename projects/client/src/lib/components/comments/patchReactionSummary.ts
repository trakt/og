import type { ReactionsSummaryResponse } from '@trakt/api';
import type { z } from 'zod/v4';
import type { reactionTypeSchema } from './reactionTypeSchema.ts';

type Reaction = z.infer<typeof reactionTypeSchema>;

/** Replacing a choice moves its distribution count, while adding/removing also moves the total and likes. */
export function patchReactionSummary({ summary, previous, next }: {
  summary: ReactionsSummaryResponse;
  previous: Reaction | undefined;
  next: Reaction | undefined;
}): ReactionsSummaryResponse {
  const distribution = { ...summary.distribution };
  if (previous) distribution[previous] = Math.max(0, (distribution[previous] ?? 0) - 1);
  if (next) distribution[next] = (distribution[next] ?? 0) + 1;
  const delta = Number(next !== undefined) - Number(previous !== undefined);
  return {
    distribution,
    reaction_count: Math.max(0, summary.reaction_count + delta),
    user_count: Math.max(0, summary.user_count + delta),
  };
}
