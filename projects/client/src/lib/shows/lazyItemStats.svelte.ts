import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { nearViewport } from '../utils/nearViewport.ts';
import { browserItemStats } from './browserItemStats.ts';
import { createStatSort } from './createStatSort.ts';
import { statSorts } from './statSorts.ts';
import type { ItemStats } from './ItemStats.ts';
import type { ItemStatsTarget } from './ItemStatsTarget.ts';

type Item = ItemStatsTarget & { id: number };

/** Local reactive view over the shared queue, with on-demand sort completion and observer cleanup. */
export function lazyItemStats<By extends string>({ items, sort, fallback }: {
  items: () => readonly Item[];
  sort: () => By;
  fallback: () => By;
}) {
  const counts = new SvelteMap<number, ItemStats | null>();
  const initial = untrack(sort);
  let by = $state(statSorts.some(({ by }) => by === initial) ? fallback() : initial);
  let loading = $state(false);
  const load = async (item: Item, visible = false) => {
    const stats = await browserItemStats.get(item, visible);
    counts.set(item.id, stats);
  };
  const select = createStatSort((item: Item) => load(item));
  $effect(() => {
    const requested = sort();
    const targets = items();
    untrack(() => {
      void select({
        by: requested,
        items: targets,
        ready: () => (by = requested),
        loading: (value) => (loading = value),
      });
    });
  });
  return {
    counts,
    observe: (item: Item) =>
      nearViewport(() => {
        void load(item, true);
      }),
    get by() {
      return by;
    },
    get loading() {
      return loading;
    },
  };
}
