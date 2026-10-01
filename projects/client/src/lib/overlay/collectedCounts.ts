import type { OverlaySlices } from './OverlaySlices.ts';

/** Unknown collections stay unknown; count individual episodes across every cached season, including specials. */
export function collectedCounts(slices: Partial<Pick<OverlaySlices, 'collectedShows' | 'collectedMovies'>>) {
  const shows = slices.collectedShows;
  return {
    episodes: shows && [...shows.values()].reduce(
      (total, seasons) => total + [...seasons.values()].reduce((count, episodes) => count + episodes.size, 0),
      0,
    ),
    shows: shows &&
      [...shows.values()].filter((seasons) => [...seasons.values()].some((episodes) => episodes.size > 0)).length,
    movies: slices.collectedMovies?.size,
  };
}
