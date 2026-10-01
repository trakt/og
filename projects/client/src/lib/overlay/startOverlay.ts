import type { User, UserManager } from 'oidc-client-ts';
import { overlay } from './overlay.ts';

/**
 * Client-only: follows the browser's user into the overlay and rechecks `last_activities` when the tab comes back.
 * A failed renewal removes the user, which lands in `stop`. Returns a cleanup for the listeners.
 */
export function startOverlay(manager: UserManager): () => void {
  const follow = (user: User | null) => {
    const sub = user?.profile.sub;
    return (sub ? overlay.start(sub) : overlay.stop()).catch(() => {});
  };
  const onUnloaded = () => follow(null);
  const onVisible = () => {
    if (document.visibilityState === 'visible') overlay.recheck().catch(() => {});
  };

  manager.events.addUserLoaded(follow);
  manager.events.addUserUnloaded(onUnloaded);
  document.addEventListener('visibilitychange', onVisible);
  manager.getUser().then(follow).catch(() => {});

  return () => {
    manager.events.removeUserLoaded(follow);
    manager.events.removeUserUnloaded(onUnloaded);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
