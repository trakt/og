import type { OverlayState } from '../../overlay/createOverlay.svelte.ts';
import type { CommentItem } from './CommentItem.ts';

/**
 * Whether a spoiler comment reads without a click (`global.js:5300-5323`): the viewer has watched the movie or the
 * episode, or every aired episode of the show or season. List comments are never blurred. Unknown state stays blurred.
 */
export function spoilerRevealed(item: CommentItem | undefined, state: OverlayState): boolean {
  if (!item) return false;
  if (item.type === 'list') return true;
  if (item.type === 'movie' || item.type === 'episode') return state.watched === true;

  const aired = item.type === 'show' || item.type === 'season' ? item.airedEpisodes ?? 0 : 0;
  return aired > 0 && (state.watchedEpisodes ?? 0) >= aired;
}
