import { describe, expect, it, vi } from 'vitest';
import { createItemStatsQueue } from './createItemStatsQueue.ts';
import type { ItemStatsTarget } from './ItemStatsTarget.ts';

const target = (season: number): ItemStatsTarget => ({ show: 1, season });
const stats = { watchers: 3, plays: 7, collectors: 2, lists: 1, comments: 0, votes: 4 };
const tick = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('createItemStatsQueue', () => {
  it('should cap concurrent requests and prioritize a visible item over pending sort requests', async () => {
    const started: number[] = [];
    const finish = new Map<number, () => void>();
    const queue = createItemStatsQueue({
      load: ({ season }) => {
        started.push(season);
        return new Promise((resolve) => finish.set(season, () => resolve(stats)));
      },
    });
    const requests = Array.from({ length: 8 }, (_, season) => queue.get(target(season)));
    await tick();
    expect(started).toEqual([0, 1, 2, 3]);
    const visible = queue.get(target(7), true);
    expect(visible).toBe(requests.at(7));
    finish.get(0)?.();
    await tick();
    expect(started).toEqual([0, 1, 2, 3, 7]);
    finish.get(1)?.();
    finish.get(2)?.();
    finish.get(3)?.();
    finish.get(7)?.();
    await tick();
    expect(started).toEqual([0, 1, 2, 3, 7, 4, 5, 6]);
    finish.get(4)?.();
    finish.get(5)?.();
    finish.get(6)?.();
    expect(await Promise.all(requests)).toEqual(Array(8).fill(stats));
  });

  it('should share in-flight and completed requests across callers without colliding shows, seasons or episodes', async () => {
    const load = vi.fn(() => Promise.resolve(stats));
    const queue = createItemStatsQueue({ load });
    const first = queue.get(target(0));
    expect(queue.get(target(0), true)).toBe(first);
    await first;
    expect(await queue.get(target(0))).toEqual(stats);
    await queue.get({ show: 2, season: 0 });
    await queue.get({ show: 1, season: 0, episode: 1 });
    await queue.get({ show: 1, season: 1, episode: 1 });
    expect(load).toHaveBeenCalledTimes(4);
  });

  it('should leave a failed item empty, cache that failure and keep the queue running', async () => {
    const load = vi.fn(({ season }: ItemStatsTarget) => {
      if (season === 0) return Promise.reject(new Error('offline'));
      return Promise.resolve(stats);
    });
    const queue = createItemStatsQueue({ load, concurrency: 1 });
    const failed = queue.get(target(0));
    const next = queue.get(target(1));
    expect(await failed).toBeNull();
    expect(await next).toEqual(stats);
    expect(await queue.get(target(0))).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
