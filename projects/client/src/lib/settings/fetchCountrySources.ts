import { rawApiFetch } from '../api/rawApiFetch.ts';
import { type FilterSource, toFilterSources } from '../components/filters/watchNowFilter.ts';

type FetchCountrySourcesParams = {
  /** SSR passes the load's; the browser uses its own. */
  fetch?: typeof globalThis.fetch;
  country: string;
};

/**
 * One country's streaming services from `/watchnow/sources/:country`, cinemas left out, by source slug. The route is
 * public, so it goes without the token. A failed or malformed read is an empty map: the favorites just don't show.
 */
export async function fetchCountrySources({ fetch, country }: FetchCountrySourcesParams) {
  const response = await rawApiFetch({ fetch, path: `/watchnow/sources/${country}` }).catch(() => null);
  if (!response?.ok) return new Map<string, FilterSource>();
  try {
    return toFilterSources(await response.json(), country);
  } catch {
    return new Map<string, FilterSource>();
  }
}
