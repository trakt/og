import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { clearRecentSearches } from '../../components/header/createRecentSearches.svelte.ts';

/** The Advanced tab's account actions. Reset Browser Data never reaches the API. */
export type AdvancedAction = 'reset-cover' | 'clear-search' | 'delete-account';

type RunAdvancedActionParams = {
  /** `authenticatedFetch` in the browser. */
  fetch: typeof fetch;
  action: AdvancedAction;
};

// `cover_id: 0` is the default fanart (trakt-web's resetCoverImageRequest). `@trakt/api` has no contract for the
// other two: `/search/recent/remove/all` and `DELETE /users/settings`

const requests: Record<AdvancedAction, (fetch: typeof globalThis.fetch) => Promise<boolean>> = {
  'reset-cover': async (fetch) => {
    const { status } = await api({ fetch }).users.cover({ body: { cover_type: 'show', cover_id: 0 } });
    return status === 204;
  },
  // The header also keeps picked queries in this browser (createRecentSearches), so a clear that went through empties
  // that copy too. A refused one leaves it alone.
  'clear-search': async (fetch) => {
    const { ok } = await rawApiFetch({ fetch, path: '/search/recent/remove/all', init: { method: 'POST' } });
    if (ok) clearRecentSearches();
    return ok;
  },
  'delete-account': async (fetch) =>
    (await rawApiFetch({ fetch, path: '/users/settings', init: { method: 'DELETE' } })).ok,
};

/** Runs one action as the viewer. Resolves whether it went through; a network failure counts as not. */
export async function runAdvancedAction({ fetch, action }: RunAdvancedActionParams): Promise<boolean> {
  try {
    return await requests[action](fetch);
  } catch {
    return false;
  }
}
