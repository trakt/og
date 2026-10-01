import type { FilterSource } from '../components/filters/watchNowFilter.ts';
import type { ServiceLink } from '../components/watchnow/watchNow.ts';
import { favoriteKey } from './favoriteKey.ts';

type FavoriteServicesParams = {
  favorites: readonly string[];
  /** The viewer's Watch Now country: a service from anywhere else is badged with its own. */
  country: string;
  sources: Readonly<Record<string, ReadonlyMap<string, FilterSource>>>;
  /** A VIP's tiles search for what streams there. */
  vip: boolean;
};

export type FavoriteService = { readonly key: string; readonly link: ServiceLink; readonly country?: string };

/**
 * The Favorite Services tiles: sorted by source like
 * then grouped by country in that order. A service whose country's list didn't load, or
 * that the country no longer has, is left out.
 */
export function favoriteServices({ favorites, country, sources, vip }: FavoriteServicesParams): FavoriteService[] {
  const keys = [...new Set(favorites)]
    .map((key) => ({ key, ...favoriteKey(key, country) }))
    .sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0));
  const countries = [...new Set(keys.map((favorite) => favorite.country))];

  return countries.flatMap((code) =>
    keys.filter((favorite) => favorite.country === code).flatMap(({ key, source }) => {
      const service = sources[code]?.get(source);
      if (!service) return [];
      const home = code === country;
      const href = vip ? `/search?watchnow=${home ? source : `${code}-${source}`}` : '';
      return [{ key, link: { ...service, slug: key, href }, ...(!home && { country: code.toUpperCase() }) }];
    })
  );
}
