/** `Reaction.emoji_map`, in OG's order. `/reactions` serves the same fixed choices. */
export const reactionOptions = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'dislike', emoji: '👎', label: 'Dislike' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'shocked', emoji: '😱', label: 'Shocked' },
  { type: 'bravo', emoji: '👏', label: 'Bravo' },
  { type: 'spoiler', emoji: '🫣', label: 'Spoiler' },
] as const;
