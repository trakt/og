/** One run of a show: the current rewatch, or everything. */
export type ShowProgress = {
  aired: number;
  completed: number;
  plays: number;
  /** Left out or 0, OG estimated it from the plays and the runtime. */
  minutesWatched?: number | null;
  /** Left out or 0, OG estimated it from the episodes left and the runtime. */
  minutesLeft?: number | null;
};
