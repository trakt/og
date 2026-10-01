import { describe, expect, it } from 'vitest';
import { overlayStorage } from './overlayStorage.ts';

describe('overlayStorage', () => {
  describe('without IndexedDB', () => {
    it('should resolve every call as a no-op', async () => {
      expect(globalThis.indexedDB).toBeUndefined();
      const storage = overlayStorage();

      await storage.save('sean', { name: 'dropped', activity: 'a', data: new Set([1]) });

      expect(await storage.load('sean')).toEqual([]);
      await expect(storage.clearExcept(null)).resolves.toBeUndefined();
    });
  });
});
