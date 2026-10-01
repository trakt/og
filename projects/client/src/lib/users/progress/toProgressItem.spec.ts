import { describe, expect, it } from 'vitest';
import type { CollectedItem } from '../../overlay/CollectedItem.ts';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { ShowCatalog } from '../../shows/cache/ShowCatalog.ts';
import { toProgressItem } from './toProgressItem.ts';

const NOW = Date.parse('2026-06-01T00:00:00Z');
const AIRED = '2026-01-01T00:00:00.000Z';
const FUTURE = '2027-01-01T00:00:00.000Z';

const show: CachedShow = {
  id: 1,
  slug: 'show',
  title: 'Show',
  genres: [],
  runtime: 30,
  airedEpisodes: 4,
  fetchedAt: 0,
  complete: true,
};

// Episode ids are season * 10 + number. Season 1 has 1x01-1x03, season 2 has 2x01 aired and 2x02 not yet.
const catalog: ShowCatalog = {
  id: 1,
  fetchedAt: 0,
  seasons: [
    { number: 0, episodes: [{ id: 1, season: 0, number: 1, firstAired: AIRED, runtime: 10 }] },
    {
      number: 1,
      episodes: [1, 2, 3].map((number) => ({ id: 10 + number, season: 1, number, firstAired: AIRED, runtime: 20 })),
    },
    {
      number: 2,
      episodes: [
        { id: 21, season: 2, number: 1, firstAired: AIRED },
        { id: 22, season: 2, number: 2, firstAired: FUTURE, runtime: 20 },
      ],
    },
  ],
};

const watched = new Map([
  [0, new Map([[1, ['2026-02-01T00:00:00Z']]])],
  [1, new Map([[11, ['2026-02-02T00:00:00Z', '2026-01-02T00:00:00Z']], [13, ['2026-02-03T00:00:00Z']]])],
]);

const base = { kind: 'watched' as const, show, includeSpecials: false, useLastActivity: false, now: NOW };

describe('toProgressItem', () => {
  describe('from the show summary', () => {
    it('should count unique regular episodes against aired and estimate times from the runtime', () => {
      const item = toProgressItem({ ...base, watched });

      expect(item).toMatchObject({
        aired: 4,
        completed: 2,
        plays: 3,
        minutesWatched: 90,
        minutesLeft: 60,
        exact: false,
        lastAt: '2026-02-03T00:00:00Z',
      });
      expect(item.detail).toBeUndefined();
    });

    it('should count only watches since a reset toward done, and every play toward plays', () => {
      const item = toProgressItem({ ...base, watched, resetAt: '2026-02-02T12:00:00Z' });

      expect(item).toMatchObject({ completed: 1, plays: 3, resetAt: '2026-02-02T12:00:00Z' });
    });

    it('should never count more done than aired', () => {
      expect(toProgressItem({ ...base, show: { ...show, airedEpisodes: 1 }, watched }).completed).toBe(1);
    });

    it('should count the library by collected episodes', () => {
      const collected = new Map([[
        1,
        new Map<number, CollectedItem>([[1, { at: '2026-03-01T00:00:00Z' }], [2, '2026-03-02T00:00:00Z']]),
      ]]);
      const item = toProgressItem({ ...base, kind: 'library', collected });

      expect(item).toMatchObject({ completed: 2, plays: 0, lastAt: '2026-03-02T00:00:00Z' });
    });
  });

  describe('from the catalog', () => {
    it('should count aired episodes only, with exact times and per-season rows', () => {
      const item = toProgressItem({ ...base, watched, catalog });

      expect(item).toMatchObject({
        aired: 4,
        completed: 2,
        plays: 3,
        minutesWatched: 60,
        minutesLeft: 50,
        exact: true,
      });
      expect(item.detail?.seasons.map(({ number, aired, completed }) => [number, aired, completed])).toEqual([
        [1, 3, 2],
        [2, 1, 0],
      ]);
      expect(item.detail?.seasons.at(0)?.episodes.at(0)).toEqual({
        number: 1,
        done: true,
        plays: 2,
        minutesWatched: 40,
        at: '2026-02-02T00:00:00Z',
      });
    });

    it('should fall back to the show runtime for an episode without one', () => {
      expect(toProgressItem({ ...base, watched, catalog }).detail?.seasons.at(1)?.minutesLeft).toBe(30);
    });

    it('should include specials when the setting says so', () => {
      const item = toProgressItem({ ...base, watched, catalog, includeSpecials: true });

      expect(item).toMatchObject({ aired: 5, completed: 3 });
      expect(item.detail?.seasons.at(0)?.number).toBe(0);
    });

    it('should leave hidden seasons out of the counts', () => {
      const item = toProgressItem({ ...base, watched, catalog, hiddenSeasons: new Set([2]) });

      expect(item).toMatchObject({ aired: 3, completed: 2 });
    });

    it('should pick the next episode after the furthest watched one, then the gap', () => {
      expect(toProgressItem({ ...base, watched, catalog }).detail?.next?.id).toBe(21);

      const all = new Map([[1, new Map([[11, [AIRED]], [13, [AIRED]]])], [2, new Map([[21, [AIRED]]])]]);
      expect(toProgressItem({ ...base, watched: all, catalog }).detail?.next?.id).toBe(12);
    });

    it('should pick the episode after the most recent watch with Calculate Up Next Using', () => {
      const recent = new Map([[1, new Map([[11, ['2026-03-01T00:00:00Z']], [13, ['2026-02-01T00:00:00Z']]])]]);
      const item = toProgressItem({ ...base, watched: recent, catalog, useLastActivity: true });

      expect(item.detail?.next?.id).toBe(12);
      expect(item.detail?.last?.id).toBe(11);
    });
  });
});
