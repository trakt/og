import type { User, UserManager } from 'oidc-client-ts';
import { commentReactions } from './commentReactions.ts';

/** Follow the browser's identity; logout and account switches clear choices and discard late responses. */
export function startCommentReactions(manager: UserManager): () => void {
  const follow = (user: User | null) => {
    commentReactions.start(user?.profile.sub ?? null);
  };
  const stop = () => follow(null);
  manager.events.addUserLoaded(follow);
  manager.events.addUserUnloaded(stop);
  manager.getUser().then(follow).catch(stop);
  return () => {
    manager.events.removeUserLoaded(follow);
    manager.events.removeUserUnloaded(stop);
    stop();
  };
}
