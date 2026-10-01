import type { OverlayState } from '../overlay/createOverlay.svelte.ts';

/**
 * The state an episode card fades and hides by. On calendars "Watchlisted" also matches every episode of a
 * watchlisted show, and "Not Watchlisted" leaves them out (`global.js:3690-3699`).
 */
export function calendarFilterState(episode: OverlayState, show: OverlayState | undefined): OverlayState {
  if (!show) return episode;
  const watchlisted = episode.watchlisted === true || show.watchlisted === true ? true : episode.watchlisted;
  return { ...episode, watchlisted };
}
