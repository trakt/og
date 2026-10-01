import type { UserStatsResponse } from '@trakt/api';
import type { HistoryFilters } from './historyFilters.ts';
import type { HistoryType } from './historyTypes.ts';

export type HistoryCounts = {
  /** "57 Items", "7 Movies", "5 Shows". */
  readonly unique?: { readonly count: number; readonly noun: 'item' | 'movie' | 'show' | 'episode' };
  readonly plays?: number;
};

type Stats = Pick<UserStatsResponse, 'movies' | 'episodes'>;

/**
 * The subnav counter on the Watched Date sort: the Shows tab counts shows, and a
 * single item, date range or genre shows plays only. Otherwise the unique count comes from the stats, and All Types
 * takes its plays from there too. `total` is the page's item count.
 */
export function historyCounts(
  { type, filters, stats, total }: {
    type: HistoryType;
    filters: HistoryFilters;
    stats: Stats | null;
    total: number;
  },
): HistoryCounts {
  if (type === 'shows') return { unique: { count: total, noun: 'show' } };
  if (filters.item || filters.startAt || filters.endAt || filters.genre || !stats) return { plays: total };
  if (type === 'all') {
    return {
      unique: { count: stats.movies.watched + stats.episodes.watched, noun: 'item' },
      plays: stats.movies.plays + stats.episodes.plays,
    };
  }
  return { unique: { count: stats[type].watched, noun: type === 'movies' ? 'movie' : 'episode' }, plays: total };
}
