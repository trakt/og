import type { BisectResult } from './BisectResult.ts';
import type { Upgrade } from './Upgrade.ts';

interface BisectUpgradesParams {
  readonly candidates: ReadonlyArray<Upgrade>;
  // Applies the set on top of everything adopted so far and verifies it. On success the probe keeps the set
  // (the baseline rolls forward); on failure it reverts to the previous baseline.
  readonly probe: (set: ReadonlyArray<Upgrade>) => Promise<boolean>;
}

const EMPTY: BisectResult = { adopted: [], rejected: [] };

const merge = (a: BisectResult, b: BisectResult): BisectResult => ({
  adopted: [...a.adopted, ...b.adopted],
  rejected: [...a.rejected, ...b.rejected],
});

// Tries the whole set first, then splits failing sets in half until each failure is pinned to one package.
// A clean run costs one probe; each breaking package costs about log2(candidates) more.
// The left half runs before the right, so the right half is verified against whatever the left adopted.
export async function bisectUpgrades({ candidates, probe }: BisectUpgradesParams): Promise<BisectResult> {
  if (candidates.length === 0) return EMPTY;
  if (await probe(candidates)) return { adopted: candidates, rejected: [] };
  if (candidates.length === 1) return { adopted: [], rejected: candidates };

  const middle = Math.ceil(candidates.length / 2);
  const left = await bisectUpgrades({ candidates: candidates.slice(0, middle), probe });
  const right = await bisectUpgrades({ candidates: candidates.slice(middle), probe });
  return merge(left, right);
}
