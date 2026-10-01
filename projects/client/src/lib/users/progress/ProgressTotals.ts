/** The summary strip's numbers across every page (OG's overall stats). */
export type ProgressTotals = {
  readonly aired: number;
  readonly completed: number;
  /** Episodes still to watch or collect. */
  readonly left: number;
  readonly minutesLeft: number;
  /** Off while any show's time left is still an estimate. */
  readonly exact: boolean;
  /** OG's whole-number percent. */
  readonly percent: number;
};
