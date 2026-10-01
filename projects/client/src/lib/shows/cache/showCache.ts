import { apiQueue } from '../../api/apiQueue.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { ApiGet } from '../../overlay/sliceSources.ts';
import type { CachedShow } from './CachedShow.ts';
import type { ShowCatalog } from './ShowCatalog.ts';
import { showStore } from './showStore.ts';

/**
 * The browser's show caches: summaries and catalogs by show id, and `get`, a public read through the request queue
 * (show data goes without the token). `background` is for work nothing on screen waits for.
 */
export const showCache = {
  summaries: showStore<CachedShow>('summaries'),
  catalogs: showStore<ShowCatalog>('catalogs'),
  get: ((path) => apiQueue.run(() => rawApiFetch({ path }))) satisfies ApiGet,
  background: ((path) => apiQueue.run(() => rawApiFetch({ path }), { visible: false })) satisfies ApiGet,
};
