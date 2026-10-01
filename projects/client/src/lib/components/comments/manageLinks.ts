import type { CommentResponse } from '@trakt/api';
import type { CommentViewer } from './CommentViewer.ts';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export type ManageLinks = {
  readonly block: boolean;
  readonly report: boolean;
  readonly edit: boolean;
  readonly delete: boolean;
};

/**
 * Which manage icons a viewer gets: block for
 * any member, report unless they're banned from commenting, edit and delete on their own comments. Delete also needs
 * no replies, or a comment under two weeks old. Share is for everyone, so it isn't here.
 */
export function manageLinks(
  { comment, viewer, now = Date.now() }: {
    comment: Pick<CommentResponse, 'user' | 'replies' | 'created_at'>;
    viewer: CommentViewer;
    now?: number;
  },
): ManageLinks {
  if (!viewer) return { block: false, report: false, edit: false, delete: false };

  const canWrite = !viewer.commentingBanned;
  const own = canWrite && !comment.user.deleted && comment.user.ids.slug === viewer.slug;
  const recent = now - new Date(comment.created_at).getTime() < TWO_WEEKS_MS;
  return { block: true, report: canWrite, edit: own, delete: own && (comment.replies === 0 || recent) };
}
