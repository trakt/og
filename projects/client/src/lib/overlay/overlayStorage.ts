import type { OverlaySlices } from './OverlaySlices.ts';

export type SliceName = keyof OverlaySlices;
/** A cached slice and the `last_activities` key it was fetched at. */
export type SliceRecord = { name: SliceName; activity: string; data: unknown };

/** Where slices outlive the tab. Every method resolves, even when storage fails, so the overlay never has to care. */
export type OverlayStorage = {
  load: (user: string) => Promise<readonly SliceRecord[]>;
  save: (user: string, record: SliceRecord) => Promise<void>;
  /** Deletes every user's records except `user`'s. `null` deletes them all. */
  clearExcept: (user: string | null) => Promise<void>;
};

const STORE = 'slices';

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  const request = indexedDB.open('og-overlay', 1);
  // Keyed by [user, slice name], so one user's records are one key range.
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  return settle(request).catch(() => null);
}

/**
 * The `og-overlay` IndexedDB database. Without IndexedDB (private mode, blocked, quota) every call is a no-op,
 * so the overlay runs from memory for the session and refetches on the next full load.
 */
export function overlayStorage(): OverlayStorage {
  let db: Promise<IDBDatabase | null> | undefined;
  // Opened on first use, so importing this on the server touches nothing.
  const store = async (mode: IDBTransactionMode) =>
    (await (db ??= open()))?.transaction(STORE, mode).objectStore(STORE);
  const quietly = <T>(task: Promise<T>, fallback: T) => task.catch(() => fallback);

  return {
    load: (user) =>
      quietly(
        (async () => {
          const slices = await store('readonly');
          return slices ? settle(slices.getAll(IDBKeyRange.bound([user], [user, []]))) : [];
        })(),
        [],
      ),
    save: (user, record) =>
      quietly(
        (async () => {
          const slices = await store('readwrite');
          if (slices) await settle(slices.put(record, [user, record.name]));
        })(),
        undefined,
      ),
    clearExcept: (user) =>
      quietly(
        (async () => {
          const slices = await store('readwrite');
          if (!slices) return;
          const keys = await settle(slices.getAllKeys());
          keys.filter((key) => Array.isArray(key) && key.at(0) !== user).forEach((key) => slices.delete(key));
        })(),
        undefined,
      ),
  };
}
