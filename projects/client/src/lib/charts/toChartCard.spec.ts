import type { MovieResponse, ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toChartCard } from './toChartCard.ts';

const options = { chart: 'popular', now: new Date('2026-09-29T12:00:00Z'), order: 'mdy' } as const;
const trending = { ...options, chart: 'trending' } as const;
const anticipated = { ...options, chart: 'anticipated' } as const;

const show = {
  title: 'Harry Potter',
  year: 2026,
  ids: { trakt: 204167, slug: 'harry-potter' },
  images: { fanart: ['media.trakt.tv/images/shows/000/204/167/fanarts/medium/abc.jpg.webp'] },
  rating: 6.6,
  aired_episodes: 0,
  first_aired: '2026-12-25T00:00:00.000Z',
  airs: { timezone: 'America/New_York' },
  network: 'HBO Max',
} as ShowResponse;

const movie = {
  title: 'Avengers: Doomsday',
  year: 2026,
  ids: { trakt: 1, slug: 'avengers-doomsday' },
  rating: 7.9,
  released: '2026-12-18',
} as MovieResponse;

describe('toChartCard', () => {
  it('should map a show onto a fanart card', () => {
    expect(toChartCard({ show }, options)).toEqual({
      type: 'show',
      id: 204167,
      href: '/shows/harry-potter',
      title: 'Harry Potter',
      year: 2026,
      image: 'https://media.trakt.tv/images/shows/000/204/167/fanarts/thumb/abc.jpg.webp',
      released: false,
      rating: 6.6,
      airedEpisodes: 0,
      tags: [],
    });
  });

  it('should tag trending rows with their watchers', () => {
    expect(toChartCard({ show, watchers: 1 }, trending).tags).toEqual([{ text: '1 watcher' }]);
    expect(toChartCard({ movie, watchers: 13196 }, trending).tags).toEqual([{ text: '13,196 watchers' }]);
  });

  it('should tag box office rows with the weekend gross', () => {
    const boxoffice = { ...options, chart: 'boxoffice' } as const;

    expect(toChartCard({ movie, revenue: 48000000 }, boxoffice).tags).toEqual([{ text: '$48,000,000' }]);
    expect(toChartCard({ movie }, boxoffice).tags).toEqual([{ text: '$0' }]);
  });

  describe('for anticipated rows', () => {
    it('should tag shows with lists, the premiere in the show zone and the network', () => {
      expect(toChartCard({ show, list_count: 53746 }, anticipated).tags).toEqual([
        { text: '53,746 lists', kind: 'list' },
        { text: 'December 24, 2026' },
        { text: 'HBO Max', kind: 'generic' },
      ]);
    });

    it('should leave out the premiere without a zone, and the network when there is none', () => {
      const bare = { ...show, airs: null, network: null } as ShowResponse;

      expect(toChartCard({ show: bare, list_count: 1 }, anticipated).tags).toEqual([{ text: '1 list', kind: 'list' }]);
    });

    it('should write the dates in the viewer order', () => {
      expect(toChartCard({ movie, list_count: 1 }, { ...anticipated, order: 'dmy' }).tags.at(1)).toEqual({
        text: '18 December 2026',
      });
    });

    it('should tag movies with lists and the release day', () => {
      expect(toChartCard({ movie, list_count: 72388 }, anticipated).tags).toEqual([
        { text: '72,388 lists', kind: 'list' },
        { text: 'December 18, 2026' },
      ]);
    });
  });

  describe('for the period charts', () => {
    const stats = { watcher_count: 14035, play_count: 1, collected_count: 138, collector_count: 6861 };

    it('should tag favorited rows with the people who favorited, singular for one', () => {
      expect(toChartCard({ show, user_count: 267 }, { ...options, chart: 'favorited' }).tags).toEqual([
        { text: '267 people favorited', kind: 'favorite' },
      ]);
      expect(toChartCard({ movie, user_count: 1 }, { ...options, chart: 'favorited' }).tags.at(0)?.text).toBe(
        '1 person favorited',
      );
    });

    it('should lead watched rows with watchers and played rows with plays', () => {
      expect(toChartCard({ movie, ...stats }, { ...options, chart: 'watched' }).tags).toEqual([
        { text: '14,035 watchers' },
        { text: '1 play', kind: 'generic' },
      ]);
      expect(toChartCard({ movie, ...stats }, { ...options, chart: 'played' }).tags).toEqual([
        { text: '1 play' },
        { text: '14,035 watchers', kind: 'generic' },
      ]);
    });

    it('should tag library shows with episodes and owners, and movies with owners', () => {
      expect(toChartCard({ show, ...stats }, { ...options, chart: 'library' }).tags).toEqual([
        { text: '138 episodes', kind: 'collect' },
        { text: '6,861 owners', kind: 'generic' },
      ]);
      expect(toChartCard({ movie, ...stats }, { ...options, chart: 'library' }).tags).toEqual([
        { text: '138 owners', kind: 'collect' },
      ]);
    });
  });

  it('should count an item as released once its date has passed, and never without one', () => {
    expect(toChartCard({ movie: { ...movie, released: '2026-09-29' } }, options).released).toBe(true);
    expect(toChartCard({ movie }, options).released).toBe(false);
    expect(toChartCard({ movie: { ...movie, released: null } }, options).released).toBe(false);
  });
});
