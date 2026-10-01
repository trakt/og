import type { api } from '../api/api.ts';
import { loadViewerLists } from './loadViewerLists.ts';
import { toViewerRelation } from './toViewerRelation.ts';
import type { ViewerRelation } from './ViewerRelation.ts';

/** The signed-in viewer's follow state with `slug`, composed from the viewer's own lists (`loadViewerLists`). */
export async function loadViewerRelation(
  { client, slug }: { client: ReturnType<typeof api>; slug: string },
): Promise<ViewerRelation> {
  return toViewerRelation(slug, await loadViewerLists({ client }));
}
