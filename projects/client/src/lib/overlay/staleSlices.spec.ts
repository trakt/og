import type { LastActivitiesResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { sliceSources } from './sliceSources.ts';
import { staleSlices } from './staleSlices.ts';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';

type Moved = Record<string, Record<string, string>>;

const at = (...fields: string[]) => Object.fromEntries(fields.map((field) => [field, T0]));
const BASE: Moved = {
  movies: at('watched_at', 'collected_at', 'rated_at', 'watchlisted_at', 'favorited_at', 'hidden_at'),
  episodes: at('watched_at', 'collected_at', 'rated_at', 'watchlisted_at'),
  shows: at('rated_at', 'watchlisted_at', 'favorited_at', 'hidden_at', 'dropped_at'),
  seasons: at('rated_at', 'watchlisted_at', 'hidden_at'),
  lists: at('updated_at'),
  watchlist: at('updated_at'),
  favorites: at('updated_at'),
  collaborations: at('updated_at'),
};

// Only the fields the slices read; the rest of the response doesn't matter here.
const activities = (moved: Moved = {}) =>
  Object.fromEntries(
    Object.entries(BASE).map(([key, fields]) => [key, { ...fields, ...moved[key] }]),
  ) as unknown as LastActivitiesResponse;

const upToDate = () => {
  const current = activities();
  return Object.fromEntries(Object.entries(sliceSources).map(([name, source]) => [name, source.activity(current)]));
};

describe('staleSlices', () => {
  it('should return every slice when nothing is cached', () => {
    expect(staleSlices({}, activities())).toEqual(Object.keys(sliceSources));
  });

  it('should return nothing when no timestamp moved', () => {
    expect(staleSlices(upToDate(), activities())).toEqual([]);
  });

  it('should refetch watched shows and rewatching when episodes are watched', () => {
    expect(staleSlices(upToDate(), activities({ episodes: { watched_at: T1 } }))).toEqual([
      'watchedShows',
      'rewatching',
    ]);
  });

  it('should refetch watched shows and progress hides when a show is hidden', () => {
    expect(staleSlices(upToDate(), activities({ shows: { hidden_at: T1 } }))).toEqual([
      'watchedShows',
      'rewatching',
      'progressHidden',
    ]);
  });

  it('should refetch progress hides when a season is hidden', () => {
    expect(staleSlices(upToDate(), activities({ seasons: { hidden_at: T1 } }))).toEqual(['progressHidden']);
  });

  it('should map each remaining timestamp to its slice', () => {
    const cases: [Moved, string[]][] = [
      [{ movies: { watched_at: T1 } }, ['watchedMovies']],
      [{ movies: { collected_at: T1 } }, ['collectedMovies']],
      [{ episodes: { collected_at: T1 } }, ['collectedShows']],
      [{ seasons: { rated_at: T1 } }, ['ratings']],
      [{ shows: { watchlisted_at: T1 } }, ['watchlist']],
      [{ seasons: { watchlisted_at: T1 } }, ['watchlist']],
      [{ episodes: { watchlisted_at: T1 } }, ['watchlist']],
      [{ movies: { favorited_at: T1 } }, ['favorites']],
      [{ shows: { dropped_at: T1 } }, ['dropped']],
      [{ lists: { updated_at: T1 } }, ['listed']],
      [{ collaborations: { updated_at: T1 } }, ['listed']],
    ];

    cases.forEach(([moved, expected]) => expect(staleSlices(upToDate(), activities(moved))).toEqual(expected));
  });

  it('should refetch only the slice that is missing', () => {
    const { dropped: _, ...rest } = upToDate();

    expect(staleSlices(rest, activities())).toEqual(['dropped']);
  });

  it('should refetch a movie/show-only watchlist cache even when timestamps have not moved', () => {
    expect(staleSlices({ ...upToDate(), watchlist: [T0, T0, T0].join('|') }, activities())).toEqual(['watchlist']);
  });
});
