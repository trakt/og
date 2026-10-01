import { z } from 'zod/v4';
import type { BuiltInListKind } from './toBuiltInListView.ts';

const metadata = z.object({
  description: z.string().nullish(),
  sort_by: z.string(),
  sort_how: z.enum(['asc', 'desc']),
});
const reordered = z.object({ updated: z.number().int().nonnegative(), skipped_ids: z.array(z.number()) });
const removed = z.object({
  deleted: z.record(z.string(), z.number().int().nonnegative()),
  not_found: z.record(z.string(), z.array(z.unknown())),
});
type Change =
  | { type: 'metadata'; body: { description?: string; sort_by: string; sort_how: string } }
  | { type: 'order'; rank: readonly number[] }
  | { type: 'notes'; id: number; notes: string }
  | { type: 'remove'; items: readonly { type: 'movie' | 'show' | 'season' | 'episode'; id: number }[] };

/** Validate every proxied response; the caller owns optimistic page state and its rollback. */
export async function writeOwnerList({ kind, change, request, notify }: {
  kind: BuiltInListKind;
  change: Change;
  request: (path: string, init: RequestInit) => Promise<Response>;
  notify: { error: (message: string) => void };
}): Promise<boolean> {
  const suffix = change.type === 'order'
    ? '/reorder'
    : change.type === 'remove'
    ? '/remove'
    : change.type === 'notes'
    ? `/${change.id}`
    : '';
  const body = change.type === 'metadata'
    ? change.body
    : change.type === 'order'
    ? { rank: change.rank }
    : change.type === 'notes'
    ? { notes: change.notes.trim() }
    : Object.fromEntries(['movie', 'show', 'season', 'episode'].map((type) => [
      `${type}s`,
      change.items.filter((item) => item.type === type).map(({ id }) => ({ ids: { trakt: id } })),
    ]));
  try {
    const response = await request(`/sync/${kind}${suffix}`, {
      method: change.type === 'metadata' || change.type === 'notes' ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(String(response.status));
    if (change.type === 'notes') {
      if (response.status !== 204) throw new Error('Invalid notes response');
      return true;
    }
    const result: unknown = await response.json();
    if (change.type === 'metadata') metadata.parse(result);
    if (change.type === 'order') {
      const order = reordered.parse(result);
      if (order.updated !== change.rank.length || order.skipped_ids.length) throw new Error('Incomplete reorder');
    }
    if (change.type === 'remove') {
      const removal = removed.parse(result);
      if (
        Object.values(removal.not_found).some((rows) => rows.length) ||
        Object.values(removal.deleted).reduce((sum, count) => sum + count, 0) !== change.items.length
      ) throw new Error('Incomplete removal');
    }
    return true;
  } catch {
    notify.error("Doh! We couldn't update your list. Please try again.");
    return false;
  }
}
