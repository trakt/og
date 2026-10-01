import { describe, expect, it } from 'vitest';
import { reactionSummary } from './reactionSummary.ts';

describe('util: reactionSummary', () => {
  it('should hide the summary when there are no reactions', () => {
    expect(reactionSummary(undefined)).toBeUndefined();
    expect(reactionSummary({ reaction_count: 0, user_count: 0, distribution: { like: 0 } })).toBeUndefined();
  });

  it("should list the reaction types that have any in OG's order, with the total", () => {
    expect(
      reactionSummary({
        reaction_count: 1502,
        user_count: 1502,
        distribution: { spoiler: 2, like: 1500, love: 0, dislike: 0, laugh: 0, shocked: 0, bravo: 0 },
      }),
    ).toEqual({
      reactions: [
        { type: 'like', emoji: '👍', title: '1.5k' },
        { type: 'spoiler', emoji: '🫣', title: '2' },
      ],
      total: '1,502',
    });
  });
});
