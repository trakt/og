import { listCommentSorts } from './listCommentSorts.ts';

/** Accept native sorts and OG's added-date URL; unsupported legacy sorts fall back to all-time reactions. */
export function listCommentSort(query: URLSearchParams): keyof typeof listCommentSorts {
  const sort = query.get('sort_by');
  if (sort === 'added') return query.get('sort_how') === 'desc' ? 'oldest' : 'newest';
  if (sort === 'likes' || sort === 'replies' || sort === 'newest' || sort === 'oldest') return sort;
  return 'likes';
}
