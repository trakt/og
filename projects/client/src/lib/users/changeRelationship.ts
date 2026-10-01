import { z } from 'zod/v4';
import type { createRelationshipOverlay } from './createRelationshipOverlay.svelte.ts';
import type { ViewerRelation } from './ViewerRelation.ts';

type Action = 'follow' | 'unfollow' | 'block' | 'unblock' | 'approve' | 'deny' | 'blockRequest';
type Params = {
  slug: string;
  isPrivate: boolean;
  relation: ViewerRelation;
  action: Action;
  overlay: ReturnType<typeof createRelationshipOverlay>;
  request: (path: string, method: 'POST' | 'DELETE') => Promise<Response>;
  notify: { error: (message: string) => void };
};
const followResult = z.object({ approved_at: z.string().nullable(), user: z.object({ username: z.string() }) });
const approvalResult = z.object({ followed_at: z.string(), user: z.object({ username: z.string() }) });

/** The patch and its authenticated write stay together; every failure restores all affected controls and counts. */
export async function changeRelationship({ slug, isPrivate, relation, action, overlay, request, notify }: Params) {
  if (overlay.busy(slug)) return false;
  const revision = overlay.revision;
  const previous = overlay.state(slug, relation);
  const current = previous.relation;
  const requestAction = ['approve', 'deny', 'blockRequest'].includes(action);
  if (requestAction && (current.requestId === null || previous.decision !== null)) return false;
  const follow = action === 'follow'
    ? (isPrivate ? 'pending' : 'following')
    : action === 'unfollow'
    ? 'none'
    : current.follow;
  const blocking = action === 'block' || action === 'blockRequest';
  const decision = action === 'approve'
    ? 'approve'
    : action === 'deny'
    ? 'deny'
    : action === 'blockRequest'
    ? 'block'
    : previous.decision;
  const next = {
    ...previous,
    relation: {
      ...current,
      follow,
      followsYou: action === 'approve' || (!blocking && action !== 'unblock' && current.followsYou),
      blocked: blocking || (action !== 'unblock' && current.blocked),
    },
    followerDelta: previous.followerDelta + Number(follow === 'following') - Number(current.follow === 'following'),
    decision,
    // OG resolves the banner in place; new Follows You/Blocked header buttons appear on the next load.
    hideBlock: blocking || action === 'unblock' || (action === 'approve' && !current.followsYou) || previous.hideBlock,
  };
  const path = requestAction && action !== 'blockRequest'
    ? `/users/requests/${current.requestId}`
    : `/users/${encodeURIComponent(slug)}/${action === 'follow' || action === 'unfollow' ? 'follow' : 'block'}`;
  const method = ['unfollow', 'unblock', 'deny'].includes(action) ? 'DELETE' : 'POST';
  overlay.start(slug);
  const rollback = overlay.patch(slug, next);
  try {
    const response = await request(path, method);
    if (overlay.revision !== revision) return false;
    if (!response.ok) throw new Error(String(response.status));
    if (action === 'follow') {
      const result = followResult.parse(await response.json());
      if (overlay.revision !== revision) return false;
      const approved = result.approved_at !== null;
      overlay.patch(slug, {
        ...next,
        relation: { ...next.relation, follow: approved ? 'following' : 'pending' },
        followerDelta: previous.followerDelta + Number(approved) - Number(current.follow === 'following'),
      });
    }
    if (action === 'approve') approvalResult.parse(await response.json());
    return true;
  } catch {
    if (overlay.revision !== revision) return false;
    rollback();
    notify.error('Doh! Your network change could not be saved. Please try again.');
    return false;
  } finally {
    if (overlay.revision === revision) overlay.finish(slug);
  }
}
