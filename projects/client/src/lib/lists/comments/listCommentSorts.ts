/** The native list-comment API supports all-time reactions/replies and both added-date directions. */
export const listCommentSorts = {
  likes: 'Reactions (All Time)',
  replies: 'Replies (All Time)',
  newest: 'Added Date (Newest)',
  oldest: 'Added Date (Oldest)',
} as const;
