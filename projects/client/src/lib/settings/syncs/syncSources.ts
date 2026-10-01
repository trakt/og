import { fetchWatchNow } from '../../components/watchnow/fetchWatchNow.ts';
import { toSourceMap } from '../../components/watchnow/watchNow.ts';
import { watchNowSourcesSchema } from '../../components/watchnow/watchNowSchema.ts';

/**
 * The streaming services' names, logos and colors for the Service column. Younify only syncs US services, and Plex
 * is listed there too, so og reads the US list whatever the viewer's Watch Now country. A failed read shows names.
 */
export async function syncSources(fetch: typeof globalThis.fetch) {
  return toSourceMap(await fetchWatchNow({ fetch, path: '/watchnow/sources/us', schema: watchNowSourcesSchema }), 'us');
}
