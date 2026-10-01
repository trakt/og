/** The summary strip's numbers across every page (`Progress::WatchedProgress#overall_stats`). */
export type ProgressTotals = {
  readonly aired: number;
  readonly completed: number;
  /** Episodes still to watch or collect. */
  readonly left: number;
  readonly minutesLeft: number;
  /** OG's whole-number percent. */
  readonly percent: number;
};
