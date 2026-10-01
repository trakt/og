/**
 * The Recent Comments block's two dropdowns and what they start on. With Lists, the
 * worker ignores the comment type, as OG did.
 */
export const recentCommentFilters = {
  commentTypes: { all: 'All', reviews: 'Reviews', shouts: 'Shouts' },
  mediaTypes: {
    all: 'All',
    movies: 'Movies',
    shows: 'Shows',
    seasons: 'Seasons',
    episodes: 'Episodes',
    lists: 'Lists',
  },
  defaults: { commentType: 'reviews', mediaType: 'all' },
} as const;
