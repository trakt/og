import { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';

const failed = "Doh! You can't like this list.";
const messageSchema = z.object({ message: z.string().optional() });

/** Liking changes list state, not media membership. The calling control owns the optimistic patch and rollback. */
export async function changeListLike({
  fetch,
  id,
  ownerSlug,
  liked,
  patch,
  notify,
}: {
  fetch: typeof globalThis.fetch;
  id: number;
  ownerSlug?: string;
  liked: boolean;
  patch: () => () => void;
  notify: (message: string) => void;
}): Promise<boolean> {
  const rollback = patch();
  try {
    const base = ownerSlug ? `/users/${encodeURIComponent(ownerSlug)}/lists/${id}` : `/lists/${id}`;
    const response = await rawApiFetch({ fetch, path: `${base}/like`, init: { method: liked ? 'POST' : 'DELETE' } });
    const text = await response.text();
    const body = text.trim() ? messageSchema.parse(JSON.parse(text)) : null;
    if (!response.ok) {
      rollback();
      notify(body?.message ?? failed);
      return false;
    }
    return true;
  } catch {
    rollback();
    notify(failed);
    return false;
  }
}
