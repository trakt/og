import { favoriteKey } from './favoriteKey.ts';

type ToggleFavoriteParams = {
  favorites: readonly string[];
  /** The picker's country, and the service in it. */
  country: string;
  source: string;
  /** The viewer's Watch Now country, which a bare stored slug belongs to. */
  home: string;
};

const matches = (key: string, { country, source, home }: Omit<ToggleFavoriteParams, 'favorites'>) => {
  const favorite = favoriteKey(key, home);
  return favorite.country === country && favorite.source === source;
};

/** The favorites with that service picked, or unpicked when it already was, stored as `<country>-<source>`. */
export function toggleFavorite({ favorites, ...service }: ToggleFavoriteParams): readonly string[] {
  const kept = favorites.filter((key) => !matches(key, service));
  return kept.length < favorites.length ? kept : [...favorites, `${service.country}-${service.source}`];
}
