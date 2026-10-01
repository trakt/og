import { rawApiFetch } from '../../api/rawApiFetch.ts';

/** There is no @trakt/api contract for this native, Official-client route. Success is an empty 204. */
export async function leaveList({ fetch, id, viewer, patch, notify }: {
  fetch: typeof globalThis.fetch;
  id: number;
  viewer: string;
  patch: () => () => void;
  notify: (message: string) => void;
}): Promise<boolean> {
  const rollback = patch();
  try {
    const response = await rawApiFetch({
      fetch,
      path: `/lists/${id}/collaborators/${encodeURIComponent(viewer)}`,
      init: { method: 'DELETE' },
    });
    if (response.status !== 204) throw new Error('Could not leave list');
    return true;
  } catch {
    rollback();
    notify('Doh! We could not stop collaborating on this list. Please try again.');
    return false;
  }
}
