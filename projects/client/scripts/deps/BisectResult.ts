import type { Upgrade } from './Upgrade.ts';

export interface BisectResult {
  readonly adopted: ReadonlyArray<Upgrade>;
  readonly rejected: ReadonlyArray<Upgrade>;
}
