import type { ApiParams } from './api.ts';
import { apiEnvironment } from './apiEnvironment.ts';
import { authorizedFetch } from './authorizedFetch.ts';
import { TRAKT_CLIENT_ID } from './traktClientId.ts';

type RawApiFetchParams = ApiParams & {
  /** Starts with `/`, e.g. `/v3/...`. */
  path: string;
  init?: RequestInit;
};

/** Plain fetch against the API for routes `@trakt/api` has no contract for, such as `/v3/*`. */
export function rawApiFetch({
  fetch = globalThis.fetch,
  token,
  environment = apiEnvironment(),
  path,
  init,
}: RawApiFetchParams): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('trakt-api-key', TRAKT_CLIENT_ID);
  headers.set('trakt-api-version', '2');

  return authorizedFetch(fetch, token)(`${environment}${path}`, { ...init, headers });
}
