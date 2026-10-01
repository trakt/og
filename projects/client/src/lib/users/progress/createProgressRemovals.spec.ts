import { describe, expect, it } from 'vitest';
import { createProgressRemovals } from './createProgressRemovals.svelte.ts';

describe('createProgressRemovals', () => {
  it('should take an item off at once and keep it off once the save goes through', async () => {
    const removals = createProgressRemovals<number>();
    let resolve = (_: boolean) => {};
    const tracked = removals.track(1388, new Promise<boolean>((done) => (resolve = done)));

    expect(removals.has(1388)).toBe(true);
    expect(removals.has(1390)).toBe(false);
    resolve(true);
    expect(await tracked).toBe(true);
    expect(removals.has(1388)).toBe(true);
  });

  it.each([
    ['fails', () => Promise.resolve(false)],
    ['rejects', () => Promise.reject(new Error('offline'))],
  ])('should put the item back when the save %s', async (_, saved) => {
    const removals = createProgressRemovals<number>();

    expect(await removals.track(2, saved())).toBe(false);
    expect(removals.has(2)).toBe(false);
  });
});
