import type { CachedShow } from './CachedShow.ts';

/**
 * A newer read of a show over its cached record. The metadata is the newer one's; a read without images keeps the
 * cached poster and fanart, and never makes an incomplete record complete.
 */
export function mergeCachedShow(cached: CachedShow | undefined, next: CachedShow): CachedShow {
  if (!cached || next.complete) return next;
  return { ...next, poster: cached.poster, fanart: cached.fanart, complete: cached.complete };
}
