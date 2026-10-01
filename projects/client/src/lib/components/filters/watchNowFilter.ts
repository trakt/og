import { https } from '../watchnow/watchNow.ts';
import { watchNowSourcesSchema } from '../watchnow/watchNowSchema.ts';
import type { FilterOptionGroup } from './filterOptions.ts';

/** A service in the viewer's country, from `/watchnow/sources/:country`. */
export type FilterSource = {
  readonly name: string;
  readonly color: string;
  readonly logo?: string;
  /** The store badge a channel sold through another service carries ("on Apple TV", "free"). */
  readonly channel?: string;
};

/** The streaming services in one country, cinemas left out like OG's `available_sources`. */
export function toFilterSources(body: unknown, country: string): Map<string, FilterSource> {
  const rows = watchNowSourcesSchema.parse(body).flatMap((byCountry) => byCountry[country] ?? []);
  return new Map(
    rows.filter(({ cinema }) => !cinema).map(({ source, name, color, images }) => [source, {
      name: name.trim(),
      color: color ?? '#000',
      ...(images?.logo && { logo: https(images.logo) }),
      ...(images?.channel && { channel: https(images.channel) }),
    }]),
  );
}

/** The API's bundles. OG also had "all countries" variants and DVD & Blu-ray, which the API ignores. */
export const watchNowBundles = [
  { id: 'any', name: 'Streaming Anywhere' },
  { id: 'free', name: 'Streaming Free' },
  { id: 'subscriptions', name: 'Streaming Subscriptions' },
] as const;

export type WatchNowBundle = (typeof watchNowBundles)[number]['id'];

// OG's option-tag replacements (advanced_filters.js:34-47): "Netflix (on Amazon)" lists as Netflix, tagged Amazon.
const storeTags = [
  [' (free)', 'Free'],
  [' (on Amazon)', 'Amazon'],
  [' (on Apple TV)', 'Apple TV'],
  [' (on Roku)', 'Roku'],
] as const;

function serviceOption(value: string, name: string) {
  const store = storeTags.find(([suffix]) => name.toLowerCase().includes(suffix.toLowerCase()));
  if (!store) return { value, label: name };
  const at = name.toLowerCase().indexOf(store[0].toLowerCase());
  return { value, label: (name.slice(0, at) + name.slice(at + store[0].length)).trim(), tag: store[1] };
}

type WatchNowOptionsParams = {
  sources: ReadonlyMap<string, FilterSource>;
  country: string;
  /** The viewer's favorite services here, as bare slugs. Only VIPs got the favorites group. */
  favorites: readonly string[];
};

/** The "Available to watch on" list: favorites, bundles, then every service. */
export function watchNowOptions({ sources, country, favorites }: WatchNowOptionsParams): FilterOptionGroup[] {
  const tag = country.toUpperCase();
  const liked = favorites.flatMap((slug) => {
    const source = sources.get(slug);
    return source ? [serviceOption(slug, source.name)] : [];
  });
  const services = [...sources.entries()]
    .filter(([slug]) => !favorites.includes(slug))
    .map(([slug, source]) => serviceOption(slug, source.name))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

  return [
    ...(liked.length > 0
      ? [{ label: 'Your Favorites', options: [{ value: 'favorites', label: 'All Favorites' }, ...liked] }]
      : []),
    { label: 'Bundles', options: watchNowBundles.map(({ id, name }) => ({ value: id, label: name, tag })) },
    ...(services.length > 0 ? [{ label: 'Streaming Services', options: services }] : []),
  ];
}

export type WatchNowTile =
  | { readonly kind: 'bundle'; readonly id: WatchNowBundle; readonly name: string; readonly country: string }
  | { readonly kind: 'service'; readonly id: string; readonly source: FilterSource };

type WatchNowTilesParams = Omit<WatchNowOptionsParams, 'favorites'> & {
  watchnow: readonly string[];
  favorites: readonly string[];
};

/**
 * The service tiles under "Available to watch on" in the sidebar: bundles
 * first, then each service. "All Favorites" shows the favorites themselves. Unknown slugs are skipped, like OG.
 */
export function watchNowTiles({ watchnow, sources, country, favorites }: WatchNowTilesParams): WatchNowTile[] {
  const bundles = watchNowBundles.filter(({ id }) => watchnow.includes(id)).map(({ id, name }) => ({
    kind: 'bundle' as const,
    id,
    name,
    country: country.toUpperCase(),
  }));
  const slugs = [...new Set(watchnow.flatMap((value) => value === 'favorites' ? favorites : [value]))];
  const services = slugs.flatMap((id) => {
    const source = sources.get(id);
    return source ? [{ kind: 'service' as const, id, source }] : [];
  });

  return [...bundles, ...services];
}
