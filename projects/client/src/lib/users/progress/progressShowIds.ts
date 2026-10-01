import type { OverlaySlices } from '../../overlay/OverlaySlices.ts';
import type { ProgressOptions } from './ProgressOptions.ts';
import type { ProgressType } from './progressTypes.ts';

type ProgressShowIdsParams = {
  type: ProgressType;
  slices: Partial<OverlaySlices>;
  options: Pick<ProgressOptions, 'includeWatchlisted' | 'includeOther'>;
};

export type ProgressShowIds =
  | { readonly ready: false }
  | {
    readonly ready: true;
    /** Every show on the tab, before filters. */
    readonly ids: readonly number[];
    /** Shows that are only there because they're watchlisted: they need aired episodes to stay. */
    readonly watchlistOnly: ReadonlySet<number>;
  };

const keys = (map: ReadonlyMap<number, unknown> | undefined) => [...(map?.keys() ?? [])];

/**
 * The shows a progress tab lists, from the overlay. Watched: every watched show, plus the library and the watchlist
 * when the settings include them, minus dropped and hidden shows. Dropped: the watched shows you dropped. Library:
 * the library, plus watched and watchlisted shows when included, minus hidden shows. Not ready until every slice the
 * tab reads has loaded, so nothing renders from half the data.
 */
export function progressShowIds({ type, slices, options }: ProgressShowIdsParams): ProgressShowIds {
  const { watchedShows, collectedShows, rewatching, dropped, progressHidden, watchlist, hidden } = slices;
  const library = type === 'library';
  const main = library ? collectedShows : watchedShows;
  const other = library ? watchedShows : collectedShows;
  const needsOther = options.includeOther && type !== 'dropped';
  const needsWatchlist = options.includeWatchlisted && type !== 'dropped';

  if (!main || !rewatching || !dropped || !progressHidden) return { ready: false };
  if ((needsOther && !other) || (needsWatchlist && !watchlist)) return { ready: false };

  if (type === 'dropped') {
    return {
      ready: true,
      ids: keys(watchedShows).filter((id) => dropped.has(id)),
      watchlistOnly: new Set(),
    };
  }

  const tabHidden = progressHidden[library ? 'collected' : 'watched'].shows;
  const optimistic = hidden?.get(library ? 'progress_collected' : 'progress_watched');
  const started = new Set([...keys(main), ...(needsOther ? keys(other) : [])]);
  const watchlistOnly = new Set(needsWatchlist ? [...(watchlist?.show ?? [])].filter((id) => !started.has(id)) : []);
  const ids = [...started, ...watchlistOnly].filter((id) =>
    !tabHidden.has(id) && !optimistic?.has(`show:${id}`) && (library || !dropped.has(id))
  );

  return { ready: true, ids, watchlistOnly };
}
