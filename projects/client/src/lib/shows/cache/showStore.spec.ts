import { describe, expect, it } from 'vitest';
import { showStore } from './showStore.ts';

describe('showStore', () => {
  describe('without IndexedDB', () => {
    it('should keep records in memory for the session', async () => {
      expect(globalThis.indexedDB).toBeUndefined();
      const store = showStore<{ id: number; title: string }>('summaries');

      await store.put([{ id: 1, title: 'Breaking Bad' }]);

      expect([...(await store.get([1, 2])).values()]).toEqual([{ id: 1, title: 'Breaking Bad' }]);
    });
  });
});
