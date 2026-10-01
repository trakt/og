import type { User } from 'oidc-client-ts';

/** A user whose token expires `expiresInSeconds` from now. */
export function fakeUser(accessToken: string, expiresInSeconds: number): User {
  return {
    access_token: accessToken,
    expires_at: Date.now() / 1000 + expiresInSeconds,
    expired: expiresInSeconds <= 0,
  } as User;
}
