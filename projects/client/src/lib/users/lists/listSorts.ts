/**
 * The lists index sort menu, each with its natural direction. Rank is only on
 * personal lists, where it's the default; collaborations default to Updated Date.
 */
export const listSorts = [
  { id: 'rank', label: 'Rank', descending: false },
  { id: 'updated', label: 'Updated Date', descending: true },
  { id: 'title', label: 'Title', descending: false },
  { id: 'likes', label: 'Likes', descending: true },
  { id: 'comments', label: 'Comments', descending: true },
  { id: 'items', label: 'Items', descending: true },
  { id: 'random', label: 'Random', descending: false },
] as const;

export type ListSortId = (typeof listSorts)[number]['id'];
