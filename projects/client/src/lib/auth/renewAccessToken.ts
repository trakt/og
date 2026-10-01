import { ErrorResponse, type User, type UserManager } from 'oidc-client-ts';

// The grant was refused, so the session is gone. Anything else (offline, timeout, 5xx, 429) leaves it spendable.
const FATAL_RENEW_ERRORS = new Set(['invalid_grant', 'invalid_client', 'unauthorized_client', 'login_required']);

type RenewAccessTokenParams = {
  manager: UserManager;
  /** The token a 401 just refused. Storage still holding it means nobody has renewed yet. */
  rejectedToken?: string | null;
};

async function renew({ manager, rejectedToken }: RenewAccessTokenParams): Promise<User | null> {
  const current = await manager.getUser();
  const expiringAt = Date.now() + manager.settings.accessTokenExpiringNotificationTimeInSeconds * 1000;
  const didAnotherTabRenew = current !== null && !current.expired &&
    current.access_token !== rejectedToken &&
    (current.expires_at ?? 0) * 1000 > expiringAt;

  if (!didAnotherTabRenew) return manager.signinSilent();

  // signinSilent raises userLoaded itself. Adopting has to as well, so this tab's listeners see the new token.
  await manager.events.load(current);
  return current;
}

function withRenewLock(task: () => Promise<User | null>): Promise<User | null> {
  if (!navigator.locks) return task();

  // lib.dom types the callback's return as a bare T, but the lock awaits the promise and resolves with its value.
  return navigator.locks.request('og-auth-renew', task) as unknown as Promise<User | null>;
}

/**
 * Renews the access token with the refresh-token grant and resolves to the new user, or null when it couldn't.
 * Refresh tokens rotate on use, so two tabs renewing at once would spend the same one twice and the second would
 * read as a replay. A Web Lock lets one tab renew at a time, and the rest adopt what it stored.
 * A refused grant removes the stored user, which logs the browser out.
 */
export async function renewAccessToken(params: RenewAccessTokenParams): Promise<User | null> {
  try {
    return await withRenewLock(() => renew(params));
  } catch (error) {
    if (error instanceof ErrorResponse && FATAL_RENEW_ERRORS.has(error.error ?? '')) {
      await params.manager.removeUser().catch(() => {});
    }
    return null;
  }
}
