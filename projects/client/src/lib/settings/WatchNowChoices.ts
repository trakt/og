import type { FilterSource } from '../components/filters/watchNowFilter.ts';

/** What the Watch Now panel picks from: every Watch Now country, and the services of the countries loaded so far. */
export type WatchNowChoices = {
  readonly countries: ReadonlyArray<{ readonly code: string; readonly name: string }>;
  readonly sources: Readonly<Record<string, ReadonlyMap<string, FilterSource>>>;
};
