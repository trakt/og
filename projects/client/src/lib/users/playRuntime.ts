type Runtime = { readonly runtime?: number | null };

/** A history row, or anything shaped like one. */
type Play = { readonly episode: Runtime; readonly show: Runtime } | { readonly movie: Runtime };

// OG's fallbacks when a runtime is missing.
const EPISODE_RUNTIME = 42;
const MOVIE_RUNTIME = 90;

/**
 * OG's runtime of one play, in minutes: a movie's runtime, or an episode's, falling back to its show's. API'
 * `runtime?` treats 0 as missing for movies and shows, while an episode's `runtime.present?` keeps it.
 */
export function playRuntime(play: Play): number {
  if ('movie' in play) return play.movie.runtime || MOVIE_RUNTIME;
  return play.episode.runtime ?? (play.show.runtime || EPISODE_RUNTIME);
}
