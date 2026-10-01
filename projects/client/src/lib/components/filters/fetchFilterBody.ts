import { rawApiFetch } from '../../api/rawApiFetch.ts';

// One request per list a page load: the network list alone is ~400KB, and reopening the panel shouldn't refetch it.
const cache = new Map<string, Promise<unknown>>();

/**
 * A filter list's raw body, fetched from the browser when the panel first opens. Every list is public, so no token
 * goes with it. A failed request is dropped from the cache so the next open retries.
 */
export function fetchFilterBody(path: string, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<unknown> {
  const cached = cache.get(path);
  if (cached) return cached;

  const request = rawApiFetch({ fetch, path }).then((response) => {
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return response.json().then((body: unknown) => body);
  });
  cache.set(path, request);
  request.catch(() => cache.delete(path));
  return request;
}
