import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { remainingListMembership } from './remainingListMembership.ts';
/** Remove the row and patch membership together; a failed DELETE restores both. */
export async function deleteList({ id, request, overlay, remove, notify }: {
  id: number;
  request: (path: string, method: string) => Promise<Response>;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  remove: () => () => void;
  notify: { error: (message: string) => void; success: (message: string) => void };
}) {
  // A failed auxiliary read doesn't prevent deletion; keep unknown/shared membership until the normal refresh.
  const remaining = await remainingListMembership({ get: (path) => request(path, 'GET'), exclude: id }).catch(() =>
    undefined
  );
  const rollback = remaining ? overlay.patch('listed', () => remaining) : () => {};
  const restore = remove();
  try {
    const response = await request(`/users/me/lists/${id}`, 'DELETE');
    if (!response.ok) throw new Error(String(response.status));
    notify.success('You deleted the list.');
    return true;
  } catch {
    restore();
    rollback();
    notify.error("Doh! We couldn't delete this list. Please try again.");
    return false;
  }
}
