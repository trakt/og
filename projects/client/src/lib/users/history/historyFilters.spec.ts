import { describe, expect, it } from 'vitest';
import { historyFilters, parseInstant } from './historyFilters.ts';

const LA = 'America/Los_Angeles';
const filters = (query: string, type: Parameters<typeof historyFilters>[1] = 'all') =>
  historyFilters(new URLSearchParams(query), type, LA);

describe('parseInstant', () => {
  it('should keep an instant with an offset and read a bare date in the viewer zone', () => {
    expect(parseInstant('2026-09-01T00:00:00Z', LA)).toBe('2026-09-01T00:00:00.000Z');
    expect(parseInstant('2026-09-01T10:45:00-07:00', LA)).toBe('2026-09-01T17:45:00.000Z');
    expect(parseInstant('2026-09-01', LA)).toBe('2026-09-01T07:00:00.000Z');
    expect(parseInstant('2026-09-01T10:45', LA)).toBe('2026-09-01T17:45:00.000Z');
  });

  it('should ignore anything else', () => {
    expect(parseInstant('yesterday', LA)).toBeUndefined();
    expect(parseInstant(null, LA)).toBeUndefined();
  });
});

describe('historyFilters', () => {
  it('should read the single item, the date range and days', () => {
    expect(filters('season=333403&start_at=2026-09-01&days=10')).toEqual({
      item: { type: 'season', id: 333403 },
      startAt: '2026-09-01T07:00:00.000Z',
      endAt: '2026-09-11T06:59:59.000Z',
    });
  });

  it('should only keep a genre the type lists, and never on All Types', () => {
    expect(filters('genres=drama', 'movies')).toEqual({ genre: 'drama' });
    expect(filters('genres=talk-show', 'movies')).toEqual({});
    expect(filters('genres=constructor', 'shows')).toEqual({});
    expect(filters('genres=drama')).toEqual({});
  });

  it('should keep Watch Now off All Types, where the picker is a placeholder', () => {
    expect(filters('watchnow=netflix,hulu', 'episodes')).toEqual({ watchnow: 'netflix,hulu' });
    expect(filters('watchnow=netflix')).toEqual({});
  });

  it('should drop an item id that is not a positive whole number', () => {
    expect(filters('movie=abc&episode=-2')).toEqual({});
  });
});
