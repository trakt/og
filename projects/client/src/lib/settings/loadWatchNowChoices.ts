import { fetchWatchNow } from '../components/watchnow/fetchWatchNow.ts';
import { watchNowCountriesSchema } from '../components/watchnow/watchNowSchema.ts';
import { fetchCountrySources } from './fetchCountrySources.ts';
import { favoriteKey } from './favoriteKey.ts';
import type { WatchNowChoices } from './WatchNowChoices.ts';

type LoadWatchNowChoicesParams = {
  fetch: typeof globalThis.fetch;
  /** The viewer's Watch Now country. */
  country: string;
  /** Their favorites, as `<country>-<source>`: each one's country needs its services for the logos. */
  favorites: readonly string[];
};

/** The Watch Now panel's country list and the services it shows first. */
export async function loadWatchNowChoices({ fetch, country, favorites }: LoadWatchNowChoicesParams) {
  const codes = [...new Set([country, ...favorites.map((key) => favoriteKey(key, country).country)])];
  const [countries, sources] = await Promise.all([
    fetchWatchNow({ fetch, path: '/watchnow/countries', schema: watchNowCountriesSchema }),
    Promise.all(codes.map((code) => fetchCountrySources({ fetch, country: code }))),
  ]);

  return {
    countries: (countries ?? []).map(({ code, name }) => ({ code, name })),
    sources: Object.fromEntries(codes.map((code, index) => [code, sources[index] ?? new Map()])),
  } satisfies WatchNowChoices;
}
