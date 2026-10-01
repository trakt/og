import { z } from 'zod/v4';
import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';

const contractedPick = z.object({
  query: z.string(),
  id: z.number().int(),
  type: z.enum(['movies', 'shows', 'people', 'lists']),
});

/** Typed native writes where the contract covers the item; raw calls for API reads/removes and contract gaps. */
export async function requestRecentSearch(
  { path, body, fetch }: { path: string; body?: unknown; fetch?: typeof globalThis.fetch },
): Promise<Response> {
  const pick = contractedPick.safeParse(body);
  if (path === '/search/recent' && pick.success) {
    const response = await api({ fetch }).search.recent.add({ body: pick.data, fetchOptions: { keepalive: true } });
    return new Response(null, { status: response.status });
  }
  // @trakt/api 0.6.0 excludes episodes and official_lists from add, and requires an id on query-only removal.
  // API's GET body is parsed by createRecentSearches. Successful mutations have no response body.
  return rawApiFetch({
    fetch,
    path,
    init: body === undefined ? { cache: 'no-store' } : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    },
  });
}
