import { TRAKT_CLIENT_ID } from '../api/traktClientId.ts';
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

let manager: UserManager | null = null;

/** The browser's one oidc-client-ts manager: auth-code + PKCE against auth.trakt.tv, the user kept in localStorage. */
export function userManager(): UserManager {
  manager ??= new UserManager({
    authority: 'https://auth.trakt.tv',
    client_id: TRAKT_CLIENT_ID,
    redirect_uri: `${location.origin}/callback`,
    post_logout_redirect_uri: location.origin,
    response_type: 'code',
    scope: 'public openid profile email',
    // No /silent-redirect is registered. Renewal is the refresh-token grant, driven by renewAccessToken.
    automaticSilentRenew: false,
    // The renewal POST rotates the refresh token as it lands, so aborting it early strands the new one.
    silentRequestTimeoutInSeconds: 30,
    requestTimeoutInSeconds: 15,
    userStore: new WebStorageStateStore({ store: localStorage }),
    stateStore: new WebStorageStateStore({ store: localStorage }),
  });

  return manager;
}
