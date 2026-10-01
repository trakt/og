import type { User } from 'oidc-client-ts';

/** Copies the browser's access token into the httpOnly cookie that seeds SSR. No user clears it. */
export function storeToken(user: User | null): Promise<Response> {
  return fetch('/api/store-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: user?.access_token ?? null,
      expiresAt: user?.expires_at ? user.expires_at * 1000 : null,
    }),
  });
}
