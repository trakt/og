/** Records kept per show id. Every method resolves, even when storage fails. */
export type ShowStore<T extends { readonly id: number }> = {
  get: (ids: readonly number[]) => Promise<ReadonlyMap<number, T>>;
  put: (records: readonly T[]) => Promise<void>;
};

const DATABASE = 'og-shows';
const STORES = ['summaries', 'catalogs'] as const;

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => STORES.forEach((name) => request.result.createObjectStore(name, { keyPath: 'id' }));
  return settle(request).catch(() => null);
}

let database: Promise<IDBDatabase | null> | undefined;

/**
 * One object store of the `og-shows` IndexedDB database, with the session's reads kept in memory in front of it.
 * Show data isn't the viewer's, so it outlives sign-out. Without IndexedDB it's memory only.
 */
export function showStore<T extends { readonly id: number }>(name: (typeof STORES)[number]): ShowStore<T> {
  const memory = new Map<number, T>();
  // Opened on first use, so importing this on the server touches nothing.
  const store = async (mode: IDBTransactionMode) =>
    (await (database ??= open()))?.transaction(name, mode).objectStore(name);

  const read = async (ids: readonly number[]): Promise<readonly T[]> => {
    const records = await store('readonly');
    if (!records) return [];
    const found = await Promise.all(ids.map((id) => settle<T | undefined>(records.get(id))));
    return found.filter((record) => record !== undefined);
  };

  return {
    get: async (ids) => {
      const missing = ids.filter((id) => !memory.has(id));
      const stored = missing.length > 0 ? await read(missing).catch(() => []) : [];
      stored.forEach((record) => memory.set(record.id, record));
      return new Map(ids.flatMap((id) => {
        const record = memory.get(id);
        return record ? [[id, record] as const] : [];
      }));
    },
    put: async (records) => {
      records.forEach((record) => memory.set(record.id, record));
      try {
        const writable = await store('readwrite');
        records.forEach((record) => writable?.put(record));
      } catch {
        // Quota or a blocked database: the records stay in memory for the session.
      }
    },
  };
}
