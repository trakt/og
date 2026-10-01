import { describe, expect, it } from 'vitest';
import { quickIconFill } from './quickIconFill.ts';

describe('quickIconFill', () => {
  it('should render idle while the state is unknown', () => {
    expect(quickIconFill({ state: {} })).toEqual({
      watched: 0,
      collected: 0,
      listed: false,
      favorited: false,
      rewatching: false,
      titles: {},
    });
  });

  it('should fill a watched or collected movie completely', () => {
    const fill = quickIconFill({ state: { watched: true, plays: 3, collected: true } });
    expect(fill.watched).toBe(1);
    expect(fill.collected).toBe(1);
  });

  describe('for shows', () => {
    it('should fill in proportion to aired episodes', () => {
      const fill = quickIconFill({
        state: { watched: true, watchedEpisodes: 12, collected: true, collectedEpisodes: 6 },
        airedEpisodes: 24,
      });
      expect(fill.watched).toBe(0.5);
      expect(fill.collected).toBe(0.25);
    });

    it('should never overfill when the counts outrun aired episodes', () => {
      expect(quickIconFill({ state: { watched: true, watchedEpisodes: 30 }, airedEpisodes: 24 }).watched).toBe(1);
    });

    it('should fall back to watched or not without an aired count', () => {
      expect(quickIconFill({ state: { watched: true, watchedEpisodes: 3 } }).watched).toBe(1);
      expect(quickIconFill({ state: { watched: false, watchedEpisodes: 0 }, airedEpisodes: 0 }).watched).toBe(0);
    });
  });

  it('should light the list icon for the watchlist or any list', () => {
    expect(quickIconFill({ state: { watchlisted: true } }).listed).toBe(true);
    expect(quickIconFill({ state: { listed: true } }).listed).toBe(true);
    expect(quickIconFill({ state: { watchlisted: false, listed: false } }).listed).toBe(false);
  });

  it('should pass favorited and rewatching through', () => {
    const fill = quickIconFill({ state: { favorited: true, rewatching: true } });
    expect(fill.favorited).toBe(true);
    expect(fill.rewatching).toBe(true);
  });

  describe('titles', () => {
    it("should total a movie's plays and runtime", () => {
      expect(quickIconFill({ state: { plays: 3 }, runtime: 104 }).titles.watched).toBe('3 plays\n5h 12m');
      expect(quickIconFill({ state: { plays: 1 } }).titles.watched).toBe('1 play');
    });

    it("should floor a show's percentage and count what remains", () => {
      const { titles } = quickIconFill({
        state: { watchedEpisodes: 12, collectedEpisodes: 20 },
        airedEpisodes: 20,
      });
      expect(titles.watched).toBe('60% watched\n12/20 episodes\n8 remaining');
      expect(titles.collected).toBe('100% in library\n20/20 episodes');
    });

    it('should say collected for a season', () => {
      const fill = quickIconFill({ state: { collectedEpisodes: 1 }, airedEpisodes: 3, season: true });
      expect(fill.titles.collected).toBe('33% collected\n1/3 episodes\n2 remaining');
    });

    it('should date a collected movie', () => {
      const fill = quickIconFill({ state: { collected: true, collectedAt: '2026-09-29T12:00:00.000Z' } });
      expect(fill.titles.collected).toBe('Added to library on\nSep 29, 2026');
    });

    it('should honor the viewer date order and zone in the collection tooltip', () => {
      const fill = quickIconFill({
        state: { collected: true, collectedAt: '2026-09-29T23:30:00Z' },
        datePreferences: { order: 'dmy', timeZone: 'Asia/Tokyo', hour24: true },
      });
      expect(fill.titles.collected).toBe('Added to library on\n30 Sep 2026');
    });

    it('should manage lists once any personal list has the item', () => {
      expect(quickIconFill({ state: { watchlisted: true } }).titles.listed).toBe('Remove from watchlist');
      expect(quickIconFill({ state: { watchlisted: true, listed: true } }).titles.listed).toBe('Manage lists');
    });

    it('should keep the idle tooltip for anything not done', () => {
      expect(quickIconFill({ state: { plays: 0, watchedEpisodes: 0, favorited: false }, airedEpisodes: 5 }).titles)
        .toEqual({});
    });
  });
  it('should format the favorite date in the viewer timezone and date order', () => {
    expect(
      quickIconFill({
        state: { favorited: true, favoritedAt: '2026-09-29T01:00:00Z' },
        datePreferences: { timeZone: 'America/Los_Angeles', order: 'dmy' },
      }).titles.favorited,
    ).toBe('Favorited on\n28 Sep 2026 6:00 PM');
  });
});

describe('rewatch progress', () => {
  it('should show rewatch progress above the complete history and honor the percentage preference', () => {
    const params = {
      state: {
        rewatching: true,
        watched: true,
        watchedEpisodes: 20,
        watchedPlays: 25,
        rewatchedEpisodes: 0,
        rewatchedPlays: 0,
      },
      airedEpisodes: 20,
    };
    expect(quickIconFill(params).watched).toBe(0);
    expect(quickIconFill(params).titles.watched).toBe(
      '0% rewatched\n0/20 episodes\n0 plays\n20 remaining\n\n100% watched\n20/20 episodes\n25 plays',
    );
    expect(quickIconFill({ ...params, adjustRewatching: false }).watched).toBe(1);
  });
});
