import { describe, expect, it, vi } from 'vitest';
import { createStatSort } from './createStatSort.ts';

describe('createStatSort', () => {
  it.each(['watchers', 'plays', 'collected', 'lists'])('should wait for every item before applying %s', async (by) => {
    const finish: (() => void)[] = [];
    const load = vi.fn(() => new Promise<void>((resolve) => finish.push(resolve)));
    const select = createStatSort(load);
    const ready = vi.fn();
    const loading = vi.fn();
    const pending = select({ by, items: [1, 2], ready, loading });
    expect(load.mock.calls).toHaveLength(2);
    expect(loading).toHaveBeenLastCalledWith(true);
    finish.at(0)?.();
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    finish.at(1)?.();
    await pending;
    expect(ready).toHaveBeenCalledOnce();
    expect(loading).toHaveBeenLastCalledWith(false);
  });

  it('should apply a normal sort immediately and discard an obsolete pending selection', async () => {
    let finish = () => {};
    const load = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const select = createStatSort(load);
    const old = vi.fn();
    const current = vi.fn();
    const loading = vi.fn();
    const pending = select({ by: 'watchers', items: [1], ready: old, loading });
    await select({ by: 'number', items: [1], ready: current, loading });
    expect(current).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(loading).toHaveBeenLastCalledWith(false);
    finish();
    await pending;
    expect(old).not.toHaveBeenCalled();
  });

  it('should still sort after an item fails and handle an empty filter result', async () => {
    const select = createStatSort(() => Promise.reject(new Error('offline')));
    const ready = vi.fn();
    const loading = vi.fn();
    await select({ by: 'lists', items: [1], ready, loading });
    expect(ready).toHaveBeenCalledOnce();
    await select({ by: 'plays', items: [], ready, loading });
    expect(loading).toHaveBeenLastCalledWith(false);
    expect(ready).toHaveBeenCalledTimes(2);
  });
});
