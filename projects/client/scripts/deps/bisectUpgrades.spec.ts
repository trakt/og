import { describe, expect, it } from 'vitest';
import { bisectUpgrades } from './bisectUpgrades.ts';
import type { Upgrade } from './Upgrade.ts';

const upgrade = (key: string): Upgrade => ({
  pin: { key, registryName: key, version: '1.0.0', prefix: '' },
  to: '1.1.0',
});

const keys = (upgrades: ReadonlyArray<Upgrade>) => upgrades.map(({ pin }) => pin.key);

// A fake probe with a rolling baseline, like the real one: a passing set is kept, a failing one is dropped.
// `breaks(state)` decides whether the tree (baseline plus the set) is broken.
const fakeProbe = (breaks: (state: ReadonlySet<string>) => boolean) => {
  const baseline = new Set<string>();
  const probes: Array<ReadonlyArray<string>> = [];
  const probe = (set: ReadonlyArray<Upgrade>) => {
    probes.push(keys(set));
    const state = new Set([...baseline, ...keys(set)]);
    if (breaks(state)) return Promise.resolve(false);
    keys(set).forEach((key) => baseline.add(key));
    return Promise.resolve(true);
  };
  return { probe, probes, baseline };
};

const candidates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(upgrade);

describe('util: bisectUpgrades', () => {
  it('should adopt everything in one probe when the whole set passes', async () => {
    const { probe, probes } = fakeProbe(() => false);
    const result = await bisectUpgrades({ candidates, probe });

    expect(keys(result.adopted)).toEqual(keys(candidates));
    expect(result.rejected).toEqual([]);
    expect(probes).toHaveLength(1);
  });

  it('should not probe at all with no candidates', async () => {
    const { probe, probes } = fakeProbe(() => false);
    expect(await bisectUpgrades({ candidates: [], probe })).toEqual({ adopted: [], rejected: [] });
    expect(probes).toEqual([]);
  });

  it('should isolate one breaking package in about log2(n) probes', async () => {
    const { probe, probes, baseline } = fakeProbe((state) => state.has('f'));
    const result = await bisectUpgrades({ candidates, probe });

    expect(keys(result.rejected)).toEqual(['f']);
    expect(keys(result.adopted).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'g', 'h']);
    expect([...baseline].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'g', 'h']);
    // all 8, right 4 fails, left 4 passes, then e,f fails, e passes, f fails, then g,h.
    expect(probes.length).toBeLessThanOrEqual(7);
  });

  it('should reject every package that breaks on its own', async () => {
    const { probe } = fakeProbe((state) => state.has('a') || state.has('h'));
    const result = await bisectUpgrades({ candidates, probe });

    expect(keys(result.rejected)).toEqual(['a', 'h']);
    expect(result.adopted).toHaveLength(6);
  });

  it('should verify later halves against what earlier halves adopted', async () => {
    // b and g each pass alone but break together: b lands first, so g is the one rejected.
    const { probe } = fakeProbe((state) => state.has('b') && state.has('g'));
    const result = await bisectUpgrades({ candidates, probe });

    expect(keys(result.rejected)).toEqual(['g']);
    expect(keys(result.adopted)).toContain('b');
  });

  it('should reject a single candidate that fails', async () => {
    const { probe } = fakeProbe(() => true);
    const result = await bisectUpgrades({ candidates: [upgrade('x')], probe });

    expect(result).toEqual({ adopted: [], rejected: [upgrade('x')] });
  });
});
