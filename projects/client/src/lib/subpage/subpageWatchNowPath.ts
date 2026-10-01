import type { z } from 'zod/v4';
import type { subpageItemSchema } from './subpageItemSchema.ts';

type Body = z.infer<typeof subpageItemSchema>;

/**
 * Where a subpage sidebar's Watch Now looks for its item. A show or
 * season without sources falls back to its first episode, like OG. Lists have none.
 */
export function subpageWatchNowPath({ type, movie, show, season, episode }: Body):
  | { readonly path: string; readonly fallback?: string }
  | undefined {
  if (type === 'movie' && movie) return { path: `/movies/${movie.ids.slug}` };
  if (!show) return undefined;

  const showPath = `/shows/${show.ids.slug}`;
  if (type === 'show') return { path: showPath, fallback: `${showPath}/seasons/1/episodes/1` };
  if (type === 'season' && season) {
    const path = `${showPath}/seasons/${season.number}`;
    return { path, fallback: `${path}/episodes/1` };
  }
  if (type === 'episode' && episode) {
    return { path: `${showPath}/seasons/${episode.season}/episodes/${episode.number}` };
  }
  return undefined;
}
