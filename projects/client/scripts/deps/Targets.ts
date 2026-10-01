// What one package can move to this run.
export interface Targets {
  // Newest allowed release on the current major.
  readonly minor?: string;
  // Newest allowed release on a later major.
  readonly major?: string;
  // Newest release a hold kept out, when a hold kept anything out.
  readonly held?: string;
}
