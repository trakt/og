import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { recentCommentFilters } from './recentCommentFilters.ts';
import { recentCommentRowsSchema } from './recentCommentRowsSchema.ts';
import { type RecentComment, toRecentComment } from './toRecentComment.ts';

type Filters = typeof recentCommentFilters;

type FetchRecentCommentsParams = {
  fetch?: typeof globalThis.fetch;
  commentType: keyof Filters['commentTypes'];
  mediaType: keyof Filters['mediaTypes'];
};

// OG's `comments.limit(15)`.
const LIMIT = 15;

/**
 * The Recent Comments block's list (`discover#comments`): the 15 newest top-level comments of that type on that kind
 * of item. The worker leaves out comments on lists that aren't public or whose owner is private, as OG did. It's a
 * public read, so it goes without the viewer's token. Rejects when the API fails.
 */
export async function fetchRecentComments(
  { fetch, commentType, mediaType }: FetchRecentCommentsParams,
): Promise<readonly RecentComment[]> {
  const query = new URLSearchParams({ limit: String(LIMIT), extended: 'images' });
  const response = await rawApiFetch({ fetch, path: `/comments/recent/${commentType}/${mediaType}?${query}` });
  if (response.status !== 200) throw new Error(`/comments/recent returned ${response.status}`);

  const rows = recentCommentRowsSchema.parse(await response.json());
  return rows.flatMap((row) => toRecentComment(row) ?? []);
}
