import { describe, expect, it } from 'vitest';
import { toWatchingNow } from './toWatchingNow.ts';

const times = { started_at: '2026-09-29T20:00:00.000Z', expires_at: '2026-09-29T20:42:00.000Z' };

describe('toWatchingNow', () => {
  describe('for an episode', () => {
    const watching = {
      ...times,
      action: 'checkin',
      type: 'episode' as const,
      show: {
        title: 'The Boys',
        runtime: 60,
        ids: { slug: 'the-boys-2019', trakt: 139960 },
        images: { fanart: ['media.trakt.tv/images/shows/000/139/960/fanarts/medium/abc.jpg.webp'] },
      },
      episode: { season: 1, number: 5, title: 'Good for the Soul', runtime: 58 },
    };

    it('should link to the episode and use the show fanart', () => {
      expect(toWatchingNow(watching)).toEqual({
        action: 'checkin',
        title: 'The Boys',
        episode: { number: '1x05', title: 'Good for the Soul' },
        href: '/shows/the-boys-2019/seasons/1/episodes/5',
        fanartUrl: 'https://media.trakt.tv/images/shows/000/139/960/fanarts/full/abc.jpg.webp',
        endsAt: times.expires_at,
        runtime: 58,
      });
    });

    it('should call season 0 episodes specials', () => {
      expect(toWatchingNow({ ...watching, episode: { season: 0, number: 3 } })?.episode).toEqual({
        number: 'Special 3',
        title: '',
      });
    });

    it('should fall back to the show runtime, then 42 minutes', () => {
      expect(toWatchingNow({ ...watching, episode: { season: 1, number: 5 } })?.runtime).toBe(60);
      expect(
        toWatchingNow({ ...watching, show: { ...watching.show, runtime: null }, episode: { season: 1, number: 5 } })
          ?.runtime,
      ).toBe(42);
    });
  });

  describe('for a movie', () => {
    it('should link to the movie and default to 90 minutes', () => {
      expect(toWatchingNow({
        ...times,
        action: 'scrobble',
        type: 'movie',
        movie: { title: 'TRON: Legacy', ids: { slug: 'tron-legacy-2010', trakt: 12601 } },
      })).toEqual({
        action: 'scrobble',
        title: 'TRON: Legacy',
        episode: null,
        href: '/movies/tron-legacy-2010',
        fanartUrl: null,
        endsAt: times.expires_at,
        runtime: 90,
      });
    });
  });

  it('should skip a response without its item', () => {
    expect(toWatchingNow({ ...times, action: 'checkin', type: 'movie', movie: null })).toBeNull();
  });
});
