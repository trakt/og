import type { z } from 'zod/v4';
import { api } from '../api/api.ts';
import type { show } from './history/historyRowsSchema.ts';

/**
 * The watched and library show lists send no images, whatever `extended` says, so each show's poster comes from its
 * summary. ponytail: one cached public call a show, 60 a page. Drop it when the worker adds images to those routes.
 */
export async function withShowPosters<T extends { show: z.infer<typeof show> }>(
  fetch: typeof globalThis.fetch,
  rows: readonly T[],
): Promise<T[]> {
  const client = api({ fetch });
  return await Promise.all(rows.map(async (row) => {
    const summary = await client.shows.summary({
      params: { id: String(row.show.ids.trakt) },
      query: { extended: 'images' },
    })
      .catch(() => null);
    return summary?.status === 200
      ? { ...row, show: { ...row.show, images: { poster: summary.body.images?.poster } } }
      : row;
  }));
}
