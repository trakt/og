import type { CommentResponse } from '@trakt/api';
import type { CommentItem } from './CommentItem.ts';

/** "Shout", "Review" or "Reply" before "by NAME". Comments on lists are always shouts. */
export function commentType(comment: Pick<CommentResponse, 'review' | 'parent_id'>, item?: CommentItem): string {
  if (comment.parent_id > 0) return 'Reply';
  if (item?.type === 'list') return 'Shout';
  return comment.review ? 'Review' : 'Shout';
}
