import imdb from '../../assets/channels/imdb.png';
import letterboxd from '../../assets/channels/letterboxd.png';
import tvTime from '../../assets/channels/tv-time.png';
import type { Source } from '../../components/watchnow/watchNow.ts';

/** The Service cell: a streaming service's tile, or the app's name when the sync has no source. */
export type SyncService =
  | { readonly kind: 'tile'; readonly source: Source; readonly slug: string }
  | { readonly kind: 'name'; readonly name: string };

type SyncServiceParams = {
  kind: 'younify' | 'plex' | 'import';
  source?: string | null;
  application?: string | null;
  /** `/watchnow/sources/us`, by source slug. */
  sources: ReadonlyMap<string, Source>;
};

/** Younify's service ids as Watch Now source slugs. */
const YOUNIFY_SOURCES: Readonly<Record<string, string>> = {
  amazon: 'amazon_prime_video',
  appletv: 'apple_tv_plus',
  discoveryplus: 'discovery_plus',
  disneyplus: 'disney_plus',
  hbomax: 'max',
  hulu: 'hulu',
  netflix: 'netflix',
  paramountplus: 'paramount_plus',
  peacock: 'peacock',
  plutotv: 'pluto_tv',
  therokuchannel: 'roku',
  tubitv: 'tubi_tv',
  vudu: 'fandango_at_home',
  youtube: 'youtube',
};

/** The importers' sources, which aren't Watch Now services: OG's own logos and button colors. */
const IMPORTERS: Readonly<Record<string, Source>> = {
  imdb: { name: 'IMDb', logo: imdb, color: '#e8b706' },
  letterboxd: { name: 'Letterboxd', logo: letterboxd, color: '#1f2830' },
  tvtime: { name: 'TV Time', logo: tvTime, color: '#000' },
};

// API's sentence case, which OG shows for a source it has no logo for: "csv" is "Csv".
const humanize = (slug: string) => {
  const words = slug.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The Service cell for one sync. */
export function syncService({ kind, source, application, sources }: SyncServiceParams): SyncService {
  if (!source) return { kind: 'name', name: application ?? 'Trakt Importer' };

  const bare = source.replace(/^[a-z]{2}-/, '');
  const slug = kind === 'younify' ? YOUNIFY_SOURCES[bare] ?? bare : bare;
  const known = IMPORTERS[slug] ?? sources.get(slug);
  return { kind: 'tile', slug, source: known ?? { name: humanize(slug), color: '#000' } };
}
