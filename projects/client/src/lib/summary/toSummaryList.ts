import type { z } from 'zod/v4';
import { type ListRow, toListRow } from '../lists/toListRow.ts';
import type { summaryListSchema } from './summaryListSchema.ts';

/** What a row on a summary's lists preview or an item's lists page shows for one list. */
export type SummaryList = Omit<ListRow, 'key'>;

/**
 * A list from `/:type/:id/lists/:type/:sort?extended=images` or `/:type/:id/listed` as a list row. A typed
 * `ListResponse` fits too.
 */
export function toSummaryList(list: z.infer<typeof summaryListSchema>): SummaryList {
  return toListRow(list);
}
