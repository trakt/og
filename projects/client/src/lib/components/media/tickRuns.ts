import type { TickRun } from './TickRun.ts';

/**
 * OG's tick bar drew one tick per aired episode, filled once it was done.
 * Consecutive episodes in the same state become one run, so a long show doesn't need a node per episode.
 */
export function tickRuns(states: readonly boolean[]): TickRun[] {
  return states.reduce<TickRun[]>((runs, done) => {
    const last = runs.at(-1);
    if (last?.done === done) return [...runs.slice(0, -1), { done, count: last.count + 1 }];
    return [...runs, { done, count: 1 }];
  }, []);
}
