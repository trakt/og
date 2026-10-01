import type { OverlayState, SeasonOf } from '../overlay/createOverlay.svelte.ts';
import type { ListStatsItem } from './toListStats.ts';

type StateOf = (type: ListStatsItem['type'], id: number, season?: SeasonOf) => OverlayState;

/** One of the stats bar's percentages: "20%" over "2/10 items". */
export interface ListProgressStat {
  readonly count: number;
  /** Rounded down, like OG's `parseInt(p * 100)`. */
  readonly percent: number;
  /** Every item counts: OG's thick icon. */
  readonly complete: boolean;
}

type Progress = { readonly watched: ListProgressStat; readonly collected: ListProgressStat };

// A show or season counts only once every aired episode does, like OG's `progress.percentage == 100`.
const allAired = (episodes: number | undefined, aired: number) => aired > 0 && (episodes ?? 0) >= aired;

function done(item: ListStatsItem, state: OverlayState, kind: 'watched' | 'collected'): boolean {
  if (item.type === 'movie' || item.type === 'episode') return state[kind] === true;
  return allAired(kind === 'watched' ? state.watchedEpisodes : state.collectedEpisodes, item.airedEpisodes);
}

const stat = (count: number, total: number): ListProgressStat => ({
  count,
  percent: total > 0 ? Math.floor((count * 100) / total) : 0,
  complete: total > 0 && count === total,
});

/**
 * How much of a list the viewer has watched and collected (`lists.js:43-78`): items whose state the overlay doesn't
 * know yet count as not, so the bar reads 0% until the library arrives, as OG's did.
 */
export function listProgress(items: readonly ListStatsItem[], stateOf: StateOf): Progress {
  const states = items.map((item) => ({
    item,
    state: stateOf(item.type, item.id, 'seasonOf' in item ? item.seasonOf : undefined),
  }));
  const count = (kind: 'watched' | 'collected') => states.filter(({ item, state }) => done(item, state, kind)).length;
  return { watched: stat(count('watched'), items.length), collected: stat(count('collected'), items.length) };
}
