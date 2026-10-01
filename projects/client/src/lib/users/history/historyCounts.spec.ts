import { describe, expect, it } from 'vitest';
import { historyCounts } from './historyCounts.ts';

const stats = { movies: { watched: 7, plays: 13 }, episodes: { watched: 50, plays: 50 } } as Parameters<
  typeof historyCounts
>[0]['stats'];
const count = (type: Parameters<typeof historyCounts>[0]['type'], filters = {}, total = 42) =>
  historyCounts({ type, filters, stats, total });

describe('historyCounts', () => {
  it('should show items and plays from the stats on All Types', () => {
    expect(count('all')).toEqual({ unique: { count: 57, noun: 'item' }, plays: 63 });
  });

  it('should show the unique count from the stats and the plays from the page on Movies and Episodes', () => {
    expect(count('movies')).toEqual({ unique: { count: 7, noun: 'movie' }, plays: 42 });
    expect(count('episodes')).toEqual({ unique: { count: 50, noun: 'episode' }, plays: 42 });
  });

  it('should count shows on the Shows tab', () => {
    expect(count('shows', { genre: 'drama' }, 5)).toEqual({ unique: { count: 5, noun: 'show' } });
  });

  it('should show plays only for one item, a date range or a genre', () => {
    expect(count('all', { startAt: '2026-09-01T00:00:00.000Z' }, 12)).toEqual({ plays: 12 });
    expect(count('movies', { item: { type: 'movie', id: 1 } }, 2)).toEqual({ plays: 2 });
    expect(count('episodes', { genre: 'drama' }, 9)).toEqual({ plays: 9 });
  });
});
