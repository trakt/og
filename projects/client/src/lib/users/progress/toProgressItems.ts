import type { OverlaySlices } from '../../overlay/OverlaySlices.ts';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { ShowCatalog } from '../../shows/cache/ShowCatalog.ts';
import type { ProgressItem } from './ProgressItem.ts';
import type { ProgressOptions } from './ProgressOptions.ts';
import type { ProgressShowIds } from './progressShowIds.ts';
import { type ProgressType, progressTypes } from './progressTypes.ts';
import { toProgressItem } from './toProgressItem.ts';

type ToProgressItemsParams = {
  type: ProgressType;
  showIds: Extract<ProgressShowIds, { ready: true }>;
  slices: Partial<OverlaySlices>;
  shows: ReadonlyMap<number, CachedShow>;
  catalogs: ReadonlyMap<number, ShowCatalog>;
  options: ProgressOptions;
  now: number;
};

const dateOf = (values: ReadonlySet<number> | ReadonlyMap<number, string> | undefined, id: number) =>
  values instanceof Map ? values.get(id) || undefined : undefined;

/**
 * Every listed show's progress, unsorted and unfiltered, plus the shows whose summary isn't cached yet (they wait for
 * it). A watchlisted show that hasn't aired is left out.
 */
export function toProgressItems(
  { type, showIds, slices, shows, catalogs, options, now }: ToProgressItemsParams,
): { items: readonly ProgressItem[]; missing: readonly number[] } {
  const { kind, settings } = progressTypes[type];
  const missing = showIds.ids.filter((id) => !shows.has(id));
  const items = showIds.ids.flatMap((id) => {
    const show = shows.get(id);
    if (!show) return [];
    if (showIds.watchlistOnly.has(id) && !(show.airedEpisodes ?? 0)) return [];
    return [toProgressItem({
      kind,
      show,
      watched: slices.watchedShows?.get(id),
      collected: slices.collectedShows?.get(id),
      resetAt: kind === 'watched' ? dateOf(slices.rewatching, id) : undefined,
      droppedAt: type === 'dropped' ? dateOf(slices.dropped, id) : undefined,
      hiddenSeasons: slices.progressHidden?.[settings].seasons.get(id),
      catalog: catalogs.get(id),
      includeSpecials: options.includeSpecials,
      useLastActivity: options.useLastActivity,
      now,
    })];
  });
  return { items, missing };
}
