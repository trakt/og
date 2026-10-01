import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { ListTarget } from './ListTarget.ts';

/** Reconcile fresh picker reads with the shared poster state, without writing to the cached record. */
export function syncPickerOverlay({ overlay, target, listed, watchlisted }: {
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  target: ListTarget;
  listed: boolean;
  watchlisted: boolean;
}) {
  const update = (before: ReadonlySet<number> | undefined, selected: boolean) => {
    const ids = new Set(before);
    if (selected) ids.add(target.id);
    else ids.delete(target.id);
    return ids;
  };
  overlay.patch('listed', (data) => ({ ...data, [target.type]: update(data[target.type], listed) }), {
    movie: new Set(),
    show: new Set(),
    season: new Set(),
    episode: new Set(),
    person: new Set(),
  });
  if (target.type === 'person') return;
  const type = target.type;
  overlay.patch('watchlist', (data) => ({ ...data, [type]: update(data[type], watchlisted) }), {
    movie: new Set(),
    show: new Set(),
  });
}
