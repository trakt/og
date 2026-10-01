import { z } from 'zod/v4';
import { createList } from '../components/lists/createList.ts';
import type { createOverlay } from '../overlay/createOverlay.svelte.ts';
import type { ListItemRef } from './fetchListItemRefs.ts';
import { listWriteError } from './listWriteError.ts';
import { removeOwnerItems } from './removeOwnerItems.ts';
import { removeListItems } from './removeListItems.ts';
import { reorderListItems } from './reorderListItems.ts';
import type { ListView } from './toListView.ts';
import type { ListSort } from './resolveListSort.ts';

const resultSchema = z.object({
  added: z.record(z.string(), z.number().int().nonnegative()),
  existing: z.record(z.string(), z.number().int().nonnegative()),
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
});
const key = (item: Pick<ListItemRef, 'type' | 'trakt'>) => `${item.type}:${item.trakt}`;
type Destination = { id: number; owner: string; name: string; watchlist?: boolean };
type Params = {
  source: ListView;
  sort: ListSort;
  items: readonly ListItemRef[];
  /** Null creates a copy of the source list's metadata. */
  destination: Destination | null;
  move: boolean;
  request: (path: string, body: unknown) => Promise<Response>;
  read: (destination: Destination) => Promise<readonly ListItemRef[]>;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  notify: { error: (message: string) => void };
};

/** Add, verify every item and preserve the order before a Move is allowed to remove anything. */
export async function transferListItems(
  { source, sort, items, destination, move, request, read, overlay, notify }: Params,
) {
  const supported = items.filter((item) => item.type !== 'person');
  const skipped = items.length - supported.length;
  let target = destination;
  // Keep a created destination on failures so retries don't create a second copy.
  try {
    if (new Set(supported.map(key)).size !== supported.length) {
      throw new Error('The source order changed. Reload the list and try again.');
    }
    if (target && !target.watchlist && target.id === source.id) throw new Error('Choose a different destination list.');
    if (!target) {
      const created = await createList({
        request,
        draft: {
          name: `${source.name} copy`,
          description: source.description ?? '',
          privacy: source.shareLink || source.pills.includes('Private')
            ? 'private'
            : source.pills.includes('Following')
            ? 'friends'
            : 'public',
          display_numbers: source.displayNumbers,
          allow_comments: source.allowComments,
          sort_by: sort.by,
          sort_how: sort.how,
        },
      });
      target = { id: created.ids.trakt, owner: 'me', name: created.name };
    }
    if (supported.length === 0) return { ok: true as const, target, count: 0, skipped };
    const saved = await addItems({ target, items: supported, overlay, request });
    if (!saved) throw new Error('Some items could not be copied. The source list was kept.');
    const destinationItems = await read(target);
    const lookup = new Map(destinationItems.map((item) => [key(item), item.id]));
    const transferred = supported.map((item) => lookup.get(key(item)));
    if (transferred.some((id) => id === undefined)) {
      throw new Error('Some items could not be copied. The source list was kept.');
    }
    const selection = new Set(supported.map(key));
    const rank = [
      ...destinationItems.filter((item) => !selection.has(key(item))).map(({ id }) => id),
      ...transferred.filter((id): id is number => id !== undefined),
    ];
    const ordered = target.watchlist ? await reorderWatchlist(request, rank) : await reorderListItems({
      owner: target.owner,
      listId: target.id,
      rank,
      request,
      notify,
      failure: 'Items were copied, but their order could not be saved. The source list was kept. Retry to finish.',
    });
    if (!ordered) return { ok: false as const, target };
    if (
      move && !await removeSource({ source, items: supported, overlay, request, notify })
    ) {
      notify.error('Items were copied, but could not be removed from the source. Retry Move to finish.');
      return { ok: false as const, target };
    }
    return { ok: true as const, target, count: supported.length, skipped };
  } catch (error) {
    if (!(error instanceof Error) || error.message !== '429') {
      notify.error(
        error instanceof Error && !(error instanceof z.ZodError)
          ? error.message
          : 'Doh! We ran into some sort of error.',
      );
    }
    return { ok: false as const, target };
  }
}

async function addItems({ target, items, overlay, request }: {
  target: Destination;
  items: readonly ListItemRef[];
  overlay: Params['overlay'];
  request: Params['request'];
}) {
  const update = (ids: ReadonlySet<number> | undefined, type: string) =>
    new Set([...(ids ?? []), ...items.filter((item) => item.type === type).map(({ trakt }) => trakt)]);
  const rollback = target.watchlist
    ? overlay.patch(
      'watchlist',
      (data) => ({
        movie: update(data.movie, 'movie'),
        show: update(data.show, 'show'),
        season: update(data.season, 'season'),
        episode: update(data.episode, 'episode'),
      }),
      { movie: new Set(), show: new Set() },
    )
    : overlay.patch(
      'listed',
      (data) => ({
        ...data,
        movie: update(data.movie, 'movie'),
        show: update(data.show, 'show'),
        season: update(data.season, 'season'),
        episode: update(data.episode, 'episode'),
      }),
      { movie: new Set(), show: new Set(), season: new Set(), episode: new Set(), person: new Set() },
    );
  try {
    const body: Record<string, { ids: { trakt: number } }[]> = {};
    for (const { type, trakt } of items) (body[`${type}s`] ??= []).push({ ids: { trakt } });
    const response = await request(
      target.watchlist ? '/sync/watchlist' : `/users/${encodeURIComponent(target.owner)}/lists/${target.id}/items`,
      body,
    );
    if (!response.ok) throw new Error(response.status === 429 ? '429' : await listWriteError(response));
    const result = resultSchema.parse(await response.json());
    const accepted = Object.values(result.added).reduce((sum, count) => sum + count, 0) +
      Object.values(result.existing).reduce((sum, count) => sum + count, 0);
    if (accepted !== items.length || Object.values(result.not_found ?? {}).some((rows) => rows.length)) {
      rollback();
      return false;
    }
    return true;
  } catch (error) {
    rollback();
    throw error;
  }
}

async function reorderWatchlist(request: Params['request'], rank: readonly number[]) {
  const response = await request('/sync/watchlist/reorder', { rank });
  if (!response.ok) throw new Error(response.status === 429 ? '429' : await listWriteError(response));
  const result = z.object({ updated: z.number(), skipped_ids: z.array(z.number()) }).parse(await response.json());
  if (result.skipped_ids.length) {
    throw new Error(
      'Items were copied, but their order could not be saved. The source list was kept. Retry to finish.',
    );
  }
  return true;
}

/** Built-in lists use their sync route, including the shared overlay rollback from the owner tools. */
function removeSource(
  { source, items, overlay, request, notify }: Pick<Params, 'source' | 'items' | 'overlay' | 'request' | 'notify'>,
) {
  if (source.kind === 'watchlist' || source.kind === 'favorites') {
    return removeOwnerItems({
      kind: source.kind,
      items: items.map((item) => ({ type: item.type, id: item.trakt })),
      overlay,
      request: (path, init) => request(path, JSON.parse(String(init.body))),
      notify,
    });
  }
  return removeListItems({ owner: source.ownerSlug, listId: source.id, items, request, notify });
}
