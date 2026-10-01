import { createRequestQueue } from './createRequestQueue.ts';

/** The browser's one queue for bulk API reads: the overlay's slices, show summaries and show catalogs. */
export const apiQueue = createRequestQueue();
