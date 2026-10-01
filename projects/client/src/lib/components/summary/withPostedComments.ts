import type { CommentResponse } from '@trakt/api';
import type { CommentTab } from '../../summary/sectionsClient.ts';

/** OG's `create.js.coffee`: posted comments go on top of Recent, which is added after Likes when there was none. */
export function withPostedComments(
  tabs: readonly CommentTab[],
  posted: readonly CommentResponse[],
): readonly CommentTab[] {
  if (posted.length === 0) return tabs;
  const recent = tabs.find((tab) => tab.id === 'recent');
  const merged: CommentTab = { id: 'recent', label: 'Recent', comments: [...posted, ...recent?.comments ?? []] };
  if (recent) return tabs.map((tab) => (tab === recent ? merged : tab));
  const afterLikes = tabs.findIndex((tab) => tab.id === 'likes') + 1;
  return [...tabs.slice(0, afterLikes), merged, ...tabs.slice(afterLikes)];
}
