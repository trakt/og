import { describe, expect, it } from 'vitest';
import type { OverlayState } from '../overlay/createOverlay.svelte.ts';
import { listProgress } from './listProgress.ts';
import type { ListStatsItem } from './toListStats.ts';

const items: ListStatsItem[] = [
  { type: 'movie', id: 1 },
  { type: 'movie', id: 2 },
  { type: 'show', id: 7, airedEpisodes: 19 },
  { type: 'season', id: 70, airedEpisodes: 9, seasonOf: { show: 7, number: 1 } },
  { type: 'episode', id: 700, seasonOf: { show: 7, number: 1, episode: 2 } },
];

const library: Record<string, OverlayState> = {
  'movie:1': { watched: true, collected: true },
  'movie:2': { watched: false, collected: true },
  // Every aired episode watched, only some collected.
  'show:7': { watched: true, watchedEpisodes: 19, collected: true, collectedEpisodes: 4 },
  // Started, not finished.
  'season:70': { watched: true, watchedEpisodes: 8, collected: true, collectedEpisodes: 9 },
  'episode:700': { watched: true, collected: false },
};

describe('listProgress', () => {
  it('should count movies and episodes by their state and shows and seasons only when complete', () => {
    const seen: unknown[] = [];
    const progress = listProgress(items, (type, id, season) => {
      seen.push(season);
      return library[`${type}:${id}`] ?? {};
    });
    expect(progress).toEqual({
      watched: { count: 3, percent: 60, complete: false },
      collected: { count: 3, percent: 60, complete: false },
    });
    // Seasons and episodes are looked up where the slices keep them.
    expect(seen.filter(Boolean)).toEqual([{ show: 7, number: 1 }, { show: 7, number: 1, episode: 2 }]);
  });

  it('should round down and mark a fully watched list complete', () => {
    const three: ListStatsItem[] = [{ type: 'movie', id: 1 }, { type: 'movie', id: 2 }, { type: 'movie', id: 3 }];
    const progress = listProgress(three, (_, id) => ({ watched: true, collected: id === 1 }));
    expect(progress.watched).toEqual({ count: 3, percent: 100, complete: true });
    expect(progress.collected).toEqual({ count: 1, percent: 33, complete: false });
  });

  it('should read 0% while the library is unknown', () => {
    expect(listProgress(items, () => ({})).watched).toEqual({ count: 0, percent: 0, complete: false });
  });

  it('should not count a show with no aired episodes', () => {
    const progress = listProgress([{ type: 'show', id: 8, airedEpisodes: 0 }], () => ({ watchedEpisodes: 0 }));
    expect(progress.watched.count).toBe(0);
  });

  it('should be 0% and incomplete for a list of only people', () => {
    expect(listProgress([], () => ({})).collected).toEqual({ count: 0, percent: 0, complete: false });
  });
});
