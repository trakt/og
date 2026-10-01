import type { SeasonOf } from '../overlay/createOverlay.svelte.ts';
import type { ListItemRow } from './listItemRowsSchema.ts';

/** An item the Watched and Collected percentages count: everything on the list but people. */
export type ListStatsItem =
  | { readonly type: 'movie'; readonly id: number }
  | { readonly type: 'show'; readonly id: number; readonly airedEpisodes: number }
  | { readonly type: 'season'; readonly id: number; readonly airedEpisodes: number; readonly seasonOf: SeasonOf }
  | { readonly type: 'episode'; readonly id: number; readonly seasonOf: SeasonOf };

/** The stats bar's numbers over every item that matches the filters, not just the page's. */
export interface ListStats {
  /** Every matching item, people too. */
  readonly count: number;
  /** Minutes to watch all of it. */
  readonly runtime: number;
  /** Left out when no one's watched state will read them: signed out, or an official list. */
  readonly items?: readonly ListStatsItem[];
}

// OG's guesses for an item without a runtime.
const MOVIE_RUNTIME = 90;
const EPISODE_RUNTIME = 42;

/** OG's `total_runtime` for one item: a show or season sums its aired episodes. */
function runtimeOf(row: ListItemRow): number {
  switch (row.type) {
    case 'movie':
      return row.movie.runtime || MOVIE_RUNTIME;
    case 'show':
      return row.show.total_runtime ?? 0;
    case 'season':
      return row.season.total_runtime ?? 0;
    case 'episode':
      return row.episode.runtime || row.show.runtime || EPISODE_RUNTIME;
    case 'person':
      return 0;
  }
}

function itemOf(row: ListItemRow): ListStatsItem | undefined {
  switch (row.type) {
    case 'movie':
      return { type: 'movie', id: row.movie.ids.trakt };
    case 'show':
      return { type: 'show', id: row.show.ids.trakt, airedEpisodes: row.show.aired_episodes ?? 0 };
    case 'season':
      return {
        type: 'season',
        id: row.season.ids.trakt,
        airedEpisodes: row.season.aired_episodes ?? 0,
        seasonOf: { show: row.show.ids.trakt, number: row.season.number },
      };
    case 'episode':
      return {
        type: 'episode',
        id: row.episode.ids.trakt,
        seasonOf: { show: row.show.ids.trakt, number: row.episode.season, episode: row.episode.number },
      };
    case 'person':
      return undefined;
  }
}

/**
 * The stats bar over a list's matching items: how many, the time to
 * watch them, and, when `withItems`, the ids the percentages look up in the viewer's library.
 */
export function toListStats(rows: readonly ListItemRow[], { withItems }: { withItems: boolean }): ListStats {
  const stats = { count: rows.length, runtime: rows.reduce((sum, row) => sum + runtimeOf(row), 0) };
  if (!withItems) return stats;
  return { ...stats, items: rows.flatMap((row) => itemOf(row) ?? []) };
}
