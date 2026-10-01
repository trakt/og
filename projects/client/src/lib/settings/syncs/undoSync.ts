import { z } from 'zod/v4';

type UndoSyncParams = {
  id: number;
  /** `DELETE` against the API as the viewer: the authenticated fetch in the browser. */
  request: (path: string, init: RequestInit) => Promise<Response>;
  notify: { success: (message: string) => void; error: (message: string) => void };
};

const messageSchema = z.object({ message: z.string() });

/**
 * Undo a sync: API removes everything it added and marks it undone. Toasts OG's "Sync undone!", or the
 * API's message when it sends one, else OG's fallback. Resolves whether it worked.
 */
export async function undoSync({ id, request, notify }: UndoSyncParams): Promise<boolean> {
  const response = await request(`/users/syncs/${id}`, { method: 'DELETE' }).catch(() => null);
  if (response?.ok) {
    notify.success('Sync undone!');
    return true;
  }
  const body = messageSchema.safeParse(await response?.json().catch(() => null));
  notify.error(body.success ? body.data.message : 'Doh! We ran into some sort of error.');
  return false;
}
