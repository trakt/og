import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import { fetchWatchNow } from './fetchWatchNow.ts';
import { offerSlugs, toSourceMap, toWatchNowButton } from './watchNow.ts';
import { watchNowOffersSchema, watchNowOrderSchema, watchNowSourcesSchema } from './watchNowSchema.ts';

type LoadWatchNowParams = {
  fetch: typeof fetch;
  /** The item's API path: `/movies/fight-club-1999`. */
  path: string;
  /** Where to look when the item has no sources: S1E1 for a show, like OG. */
  fallback?: string;
  country: string;
  settings: ViewerSettings | null;
  isVip: boolean;
};

/**
 * The sidebar Watch Now block for SSR: the item's offers in the viewer's country (with the JustWatch rank the
 * ratings strip shows), their ranking, and the country's service names and logos. The ranking comes without the
 * viewer's favorites, which go first from their settings instead.
 */
export async function loadWatchNow({ fetch, path, fallback, country, settings, isVip }: LoadWatchNowParams) {
  const load = (at: string) =>
    Promise.all([
      fetchWatchNow({
        fetch,
        path: `${at}/watchnow/${country}?extended=streaming_ranks`,
        schema: watchNowOffersSchema,
      }),
      fetchWatchNow({ fetch, path: `${at}/watchnow/favorites/${country}`, schema: watchNowOrderSchema }),
    ]);
  const sources = fetchWatchNow({ fetch, path: `/watchnow/sources/${country}`, schema: watchNowSourcesSchema });

  let [watchnow, order] = await load(path);
  const rank = watchnow?.[country]?.streaming_ranks ?? null;
  let at = path;
  if (fallback && offerSlugs(watchnow?.[country]).length === 0) {
    at = fallback;
    [watchnow, order] = await load(fallback);
  }

  const favorites = settings?.browsing?.watchnow;
  return {
    rank,
    button: toWatchNowButton({
      path: at,
      offers: watchnow?.[country] ?? null,
      order,
      sources: toSourceMap(await sources, country),
      country,
      favorites: favorites?.favorites ?? [],
      onlyFavorites: favorites?.only_favorites ?? false,
      isVip,
    }),
  };
}
