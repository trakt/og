import { rawApiFetch } from '../api/rawApiFetch.ts';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { userManager } from '../auth/userManager.ts';

/** Browser-only writes use the token owner and renewal path, never the SSR cookie. */
export function relationshipRequest(path: string, method: 'POST' | 'DELETE') {
  return rawApiFetch({ fetch: authenticatedFetch({ manager: userManager() }), path, init: { method } });
}
