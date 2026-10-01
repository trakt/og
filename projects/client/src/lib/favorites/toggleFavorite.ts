import { z } from 'zod/v4';
import type { createOverlay } from '../overlay/createOverlay.svelte.ts';
import type { FavoriteTarget } from './FavoriteTarget.ts';
import { loadFavoriteRows } from './loadFavoriteRows.ts';

type Params = {
  target: FavoriteTarget;
  remove: boolean;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  request: (path: string, body?: unknown) => Promise<Response>;
  notify: { success: (message: string) => void; error: (message: string) => void };
  now?: () => Date;
};
const resultSchema = z.object({
  added: z.object({ movies: z.number(), shows: z.number() }).nullish(),
  existing: z.object({ movies: z.number(), shows: z.number() }).nullish(),
  deleted: z.object({ movies: z.number(), shows: z.number() }).nullish(),
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
});
const errorSchema = z.object({ message: z.string().optional() });

/** Optimistic membership; failure to read the note id never undoes a successful favorite. */
export async function toggleFavorite({ target, remove, overlay, request, notify, now = () => new Date() }: Params) {
  const date = now().toISOString();
  const rollback = overlay.patch('favorites', (favorites) => {
    const ids = new Set(favorites[target.type]);
    const dates = new Map(favorites.dates?.[target.type]);
    if (remove) {
      ids.delete(target.id);
      dates.delete(target.id);
    } else {
      ids.add(target.id);
      dates.set(target.id, date);
    }
    return {
      ...favorites,
      [target.type]: ids,
      dates: { movie: new Map(), show: new Map(), ...favorites.dates, [target.type]: dates },
    };
  }, { movie: new Set(), show: new Set() });

  try {
    const response = await request(`/sync/favorites${remove ? '/remove' : ''}`, {
      [`${target.type}s`]: [{ ids: { trakt: target.id } }],
    });
    if (!response.ok) {
      const body = errorSchema.safeParse(await response.json().catch(() => null));
      if (response.status !== 429) {
        notify.error(
          body.success && body.data.message ? body.data.message : "Doh! You can't add this to your favorites.",
        );
      }
      rollback();
      return null;
    }
    const result = resultSchema.parse(await response.json());
    const key = target.type === 'movie' ? 'movies' : 'shows';
    const count = remove ? result.deleted?.[key] : (result.added?.[key] ?? 0) + (result.existing?.[key] ?? 0);
    if (!count || Object.values(result.not_found ?? {}).some((items) => items.length)) {
      throw new Error('Item not found');
    }
  } catch {
    rollback();
    notify.error("Doh! You can't add this to your favorites.");
    return null;
  }

  notify.success(`${remove ? 'Removed' : 'Added'} ${target.title} ${remove ? 'from' : 'to'} your favorites.`);
  if (remove) return null;
  try {
    const rows = await loadFavoriteRows(request);
    const row = rows.find((row) =>
      row.type === target.type && (row.type === 'movie' ? row.movie : row.show).ids.trakt === target.id
    );
    if (!row) throw new Error('Favorite not found');
    if (row.listed_at) {
      overlay.patch('favorites', (favorites) => ({
        ...favorites,
        dates: {
          movie: new Map(),
          show: new Map(),
          ...favorites.dates,
          [target.type]: new Map(favorites.dates?.[target.type]).set(target.id, row.listed_at ?? date),
        },
      }));
    }
    return { id: row.id, notes: row.notes ?? '' };
  } catch {
    notify.error('Your favorite was saved, but we could not open its notes. Try editing them from your favorites.');
    return null;
  }
}
