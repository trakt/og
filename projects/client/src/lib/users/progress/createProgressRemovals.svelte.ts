import { SvelteSet } from 'svelte/reactivity';

/**
 * The rows (or seasons) a drop or hide took off the page. One leaves as its save starts and comes back if the save
 * doesn't go through, so the page never waits on the API to answer. Page-scoped: nothing here is saved.
 */
export function createProgressRemovals<Key>() {
  const removed = new SvelteSet<Key>();

  return {
    has: (key: Key) => removed.has(key),
    /** Takes the item off now; resolves whether it stayed off. */
    track: async (key: Key, saved: Promise<boolean>): Promise<boolean> => {
      removed.add(key);
      const kept = await saved.catch(() => false);
      if (!kept) removed.delete(key);
      return kept;
    },
  };
}
