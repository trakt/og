import type { UserManager } from 'oidc-client-ts';
import { renewAccessToken } from './renewAccessToken.ts';

type AuthenticatedFetchParams = {
  manager: UserManager;
  baseFetch?: typeof fetch;
};

/**
 * Browser fetch for apiz that sends the stored user's Bearer token. A 401 renews the token and retries once.
 * Pass it to `api({ fetch })` or `rawApiFetch({ fetch })` without a `token`.
 */
export function authenticatedFetch({ manager, baseFetch = globalThis.fetch }: AuthenticatedFetchParams): typeof fetch {
  return async (input, init) => {
    const send = (token: string | undefined) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return baseFetch(input, { ...init, headers });
    };

    const token = (await manager.getUser())?.access_token;
    const response = await send(token);
    if (response.status !== 401 || !token) return response;

    const renewed = (await renewAccessToken({ manager, rejectedToken: token }))?.access_token;
    if (!renewed || renewed === token) return response;

    return send(renewed);
  };
}
