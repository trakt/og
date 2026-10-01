import { z } from 'zod/v4';
import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { toHiddenItem } from './toHiddenItem.ts';
import { hiddenSections } from './hiddenSections.ts';
const resultSchema = z.object({
  deleted: z.record(z.string(), z.number()),
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
});
/** Patch visibility alongside the write. Rollback also restores the page card through its caller. */
export async function restoreHiddenItem({ item, type, overlay, request, notify }: {
  item: NonNullable<ReturnType<typeof toHiddenItem>>;
  type: keyof typeof hiddenSections;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  request: (path: string, body: unknown) => Promise<Response>;
  notify: { success: (message: string) => void; error: (message: string) => void };
}) {
  const section = hiddenSections[type].section;
  const rollback = type === 'dropped' || type === 'rewatching'
    ? overlay.patch(type === 'dropped' ? 'dropped' : 'rewatching', (values) => {
      const next = new Map([...values.keys()].map((id) => [id, values instanceof Map ? values.get(id) ?? '' : '']));
      if (typeof item.id === 'number') next.delete(item.id);
      return next;
    }, new Map())
    : overlay.patch('hidden', (values) => {
      const keys = new Set(values.get(section));
      keys.delete(item.key);
      return new Map(values).set(section, keys);
    }, new Map());
  try {
    const response = await request(`/users/hidden/${section}/remove`, {
      [`${item.type}s`]: [{ ids: typeof item.id === 'number' ? { trakt: item.id } : { slug: item.id } }],
    });
    if (!response.ok) throw new Error(String(response.status));
    const result = resultSchema.parse(await response.json());
    if (!result.deleted[`${item.type}s`] || Object.values(result.not_found ?? {}).some((items) => items.length)) {
      throw new Error('Item was not restored');
    }
  } catch (error) {
    rollback();
    if (!(error instanceof Error) || error.message !== '429') {
      notify.error('Doh! We could not restore this item. Please try again.');
    }
    return false;
  }
  notify.success(type === 'comments' ? `You unblocked ${item.title}.` : `You restored ${item.title}.`);
  return true;
}
