import { describe, expect, it } from 'vitest';
import type { DatePreferences } from '../DatePreferences.ts';
import { toAccountLimits } from './toAccountLimits.ts';

const datePreferences: DatePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 };
const now = new Date('2026-09-30T12:00:00Z');

const limits = {
  list: { count: 7, item_count: 1_000 },
  watchlist: { item_count: 1_000 },
  favorites: { item_count: 100 },
  collection: { item_count: 1_000 },
  notes: { item_count: 100 },
  saved_filters: { count: 5 },
};

const settings = (user: Record<string, unknown>, extra: Record<string, unknown> = { limits }) => ({
  user: { vip: false, ...user },
  ...extra,
});

const column = (result: ReturnType<typeof toAccountLimits>, key: 'free' | 'yours' | 'vip') =>
  result?.rows.map((row) => row[key]);

describe('mapper: toAccountLimits', () => {
  describe('for a free member', () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2024-02-12T09:00:00.000Z' }),
      now,
      datePreferences,
    });

    it("should list OG's Free Plan, the API's current limits and OG's VIP limits", () => {
      expect(result?.rows.map((row) => row.feature)).toEqual([
        'Watched History',
        'Ratings',
        'Favorites',
        'Watchlist Items',
        'Lists',
        'List Items',
        'Library Items',
        'Notes',
        'Saved Filters',
      ]);
      expect(column(result, 'free')).toEqual([100_000, 50_000, 100, 1_000, 5, 1_000, 1_000, 100, 5]);
      expect(column(result, 'yours')).toEqual([100_000, 50_000, 100, 1_000, 7, 1_000, 1_000, 100, 5]);
      expect(column(result, 'vip')).toEqual([100_000, 50_000, 100, 5_000, 100, 1_000, 100_000, 1_000, 100]);
    });

    it('should mark the earned lists and count them', () => {
      expect(result?.rows.find((row) => row.feature === 'Lists')?.earned).toBe(true);
      expect(result).toMatchObject({ vip: false, earnedLists: 2, maxedOut: false, traktiversary: null });
    });

    it('should show the Traktiversary date and thank two full years', () => {
      expect(result).toMatchObject({ date: 'February 12', years: '2.63' });
    });
  });

  it("should fall back to OG's limits when the API sends none", () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2020-01-01T00:00:00.000Z' }, {}),
      now,
      datePreferences,
    });
    expect(result?.rows.find((row) => row.feature === 'Lists')?.yours).toBe(11);
  });

  it('should promise a first-year member a list and skip the thanks', () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2026-03-01T00:00:00.000Z' }, { limits: { list: { count: 5 } } }),
      now,
      datePreferences,
    });
    expect(result).toMatchObject({ earnedLists: null, years: null, maxedOut: false });
    expect(result?.rows.find((row) => row.feature === 'Lists')).toMatchObject({ yours: 5, earned: false });
  });

  it('should cap the earned lists at eight and say so', () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2012-02-12T00:00:00.000Z' }, {}),
      now,
      datePreferences,
    });
    expect(result).toMatchObject({ earnedLists: 8, maxedOut: true, years: '14.63' });
  });

  it('should celebrate the Traktiversary on the day, in UTC like API', () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2023-09-30T20:00:00.000Z' }),
      now: new Date('2026-09-30T23:00:00Z'),
      datePreferences,
    });
    expect(result?.traktiversary).toBe('Today is your 3rd Traktiversary! 🎉');
  });

  it("should use API' ordinals", () => {
    const on = (joined: string) =>
      toAccountLimits({ settings: settings({ joined_at: joined }), now, datePreferences })?.traktiversary;
    expect(on('2025-09-30T00:00:00.000Z')).toBe('Today is your 1st Traktiversary! 🎉');
    expect(on('2015-09-30T00:00:00.000Z')).toBe('Today is your 11th Traktiversary! 🎉');
    expect(on('2014-09-30T00:00:00.000Z')).toBe('Today is your 12th Traktiversary! 🎉');
  });

  it('should not celebrate the signup day itself', () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2026-09-30T01:00:00.000Z' }),
      now,
      datePreferences,
    });
    expect(result?.traktiversary).toBeNull();
  });

  it("should show the date in the viewer's zone and date order", () => {
    const result = toAccountLimits({
      settings: settings({ joined_at: '2012-02-12T03:00:00.000Z' }),
      now,
      datePreferences: { ...datePreferences, order: 'dmy', timeZone: 'America/Los_Angeles' },
    });
    expect(result?.date).toBe('11 February');
  });

  describe('for a VIP', () => {
    const result = toAccountLimits({
      settings: settings({ vip: true, joined_at: '2012-02-12T09:00:00.000Z' }, {
        // A VIP's API limits are the VIP ones; notes stand in for a limit API raised since OG's constants.
        limits: {
          list: { count: 100, item_count: 1_000 },
          watchlist: { item_count: 5_000 },
          favorites: { item_count: 100 },
          collection: { item_count: 100_000 },
          notes: { item_count: 2_000 },
          saved_filters: { count: 100 },
        },
      }),
      now,
      datePreferences,
    });

    it("should show the limits earned without VIP and the API's VIP limits", () => {
      expect(column(result, 'yours')).toEqual([100_000, 50_000, 100, 1_000, 13, 1_000, 1_000, 100, 5]);
      expect(column(result, 'vip')).toEqual([100_000, 50_000, 100, 5_000, 100, 1_000, 100_000, 2_000, 100]);
    });

    it('should not mark the earned lists', () => {
      expect(result?.rows.find((row) => row.feature === 'Lists')?.earned).toBe(false);
      expect(result?.vip).toBe(true);
    });
  });

  it('should give up without a join date', () => {
    expect(toAccountLimits({ settings: { user: { vip: true } }, now, datePreferences })).toBeNull();
    expect(toAccountLimits({ settings: null, now, datePreferences })).toBeNull();
  });
});
