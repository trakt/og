import { statSorts } from './statSorts.ts';

/** Commit only the latest selection, and only after all its items have stats. Other sorts commit immediately. */
export function createStatSort<T>(load: (item: T) => Promise<unknown>) {
  let selection = 0;
  return async ({
    by,
    items,
    ready,
    loading,
  }: {
    by: string;
    items: readonly T[];
    ready: () => void;
    loading: (pending: boolean) => void;
  }) => {
    const current = ++selection;
    const needsStats = statSorts.some((sort) => sort.by === by);
    loading(needsStats && items.length > 0);
    if (needsStats) await Promise.all(items.map((item) => load(item).catch(() => null)));
    if (current !== selection) return;
    ready();
    loading(false);
  };
}
