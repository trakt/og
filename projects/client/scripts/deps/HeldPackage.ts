// A package a hold kept below a newer release this run.
export interface HeldPackage {
  readonly key: string;
  readonly current: string;
  readonly held: string;
  readonly reason: string;
}
