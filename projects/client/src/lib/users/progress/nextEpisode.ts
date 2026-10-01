type Episode = { readonly id: number };

type NextEpisodeParams<T extends Episode> = {
  /** The eligible episodes (aired, not hidden, specials only when included), in season then episode order. */
  episodes: readonly T[];
  /** Watched since the reset (or, on Library, collected). */
  done: (episode: T) => boolean;
  /** The episode with the most recent watch (or addition). */
  latest?: number;
  /** "Calculate Up Next Using: Last episode watched" (or added to library). */
  useLastActivity: boolean;
};

/**
 * OG's next episode. From the most recently watched episode when "Calculate Up Next Using" says so, otherwise from the
 * furthest one watched: the first undone episode after it, else the first undone one anywhere (a gap), else none.
 * Nothing watched yet starts at the first episode.
 */
export function nextEpisode<T extends Episode>(
  { episodes, done, latest, useLastActivity }: NextEpisodeParams<T>,
): T | undefined {
  const furthest = episodes.findLastIndex(done);
  const recent = useLastActivity ? episodes.findIndex(({ id }) => id === latest) : -1;
  const anchor = recent >= 0 ? recent : furthest;

  return episodes.slice(anchor + 1).find((episode) => !done(episode)) ?? episodes.find((episode) => !done(episode));
}
