import { z } from 'zod/v4';
import type { ListItemRef } from './fetchListItemRefs.ts';
import { listWriteError } from './listWriteError.ts';

const resultSchema = z.object({ deleted: z.record(z.string(), z.number()) });
const KEYS = { movie: 'movies', show: 'shows', season: 'seasons', episode: 'episodes', person: 'people' } as const;

type Params = {
  owner: string;
  listId: number;
  items: readonly Pick<ListItemRef, 'type' | 'trakt'>[];
  request: (path: string, body: unknown) => Promise<Response>;
  notify: { error: (message: string) => void };
};

/**
 * `POST /users/:owner/lists/:id/items/remove` with the items' media.
 * Items already gone come back as `not_found`, which still leaves them off the list.
 */
export async function removeListItems({ owner, listId, items, request, notify }: Params): Promise<boolean> {
  const body: Partial<Record<(typeof KEYS)[keyof typeof KEYS], { ids: { trakt: number } }[]>> = {};
  for (const { type, trakt } of items) (body[KEYS[type]] ??= []).push({ ids: { trakt } });
  let response: Response | undefined;
  try {
    response = await request(`/users/${encodeURIComponent(owner)}/lists/${listId}/items/remove`, body);
    if (response.ok && resultSchema.safeParse(await response.json()).success) return true;
  } catch {
    // A network failure gets the generic toast.
  }
  if (response?.status !== 429) notify.error(await listWriteError(response));
  return false;
}
