import type { UserManager } from 'oidc-client-ts';
import { renewAccessToken } from './renewAccessToken.ts';
import { storeToken } from './storeToken.ts';

type SyncSessionParams = {
  manager: UserManager;
  /** Whether the auth cookie reached the server for this page. */
  hasSession: boolean;
  /** Re-runs the loaders once the cookie changed. `invalidateAll` in the app. */
  reload: () => Promise<void>;
};

/**
 * Keeps the httpOnly cookie in step with the browser's user, and reloads page data when it changes.
 * An expired user renews here, because the server never does. Returns a cleanup for the event listeners.
 */
export function syncSession({ manager, hasSession, reload }: SyncSessionParams): () => void {
  const store = (user: Parameters<typeof storeToken>[0]) =>
    storeToken(user)
      .then(reload)
      .catch(() => {});
  const onUnloaded = () => store(null);

  manager.events.addUserLoaded(store);
  manager.events.addUserUnloaded(onUnloaded);

  manager.getUser().then(async (user) => {
    // Renewing raises userLoaded, or removes the user on a refused grant, and both land in `store`.
    if (user?.expired) await renewAccessToken({ manager });
    else if ((user !== null) !== hasSession) await store(user);
  }).catch(() => {});

  return () => {
    manager.events.removeUserLoaded(store);
    manager.events.removeUserUnloaded(onUnloaded);
  };
}
