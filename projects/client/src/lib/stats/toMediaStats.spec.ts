import type { RatingsResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import type { SubpageMedia } from '../subpage/toSubpageMedia.ts';
import { toMediaStats } from './toMediaStats.ts';

const media: SubpageMedia = {
  item: { type: 'movie', id: 1, title: 'Fight Club' },
  title: 'Fight Club',
  href: '/movies/fight-club-1999',
  released: '1999-10-15',
  parents: [],
  links: [],
};
const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 2, 8: 9, 9: 50, 10: 105 };
const ratings: RatingsResponse = {
  trakt: { rating: 8.999, votes: 2723, distribution },
  imdb: { rating: 8.8, votes: 1000000, link: 'https://www.imdb.com/title/tt0137523' },
};
const stats = { watchers: 1, plays: 2, collectors: 3, comments: 4, lists: 5, favorited: 6, votes: 2723 };
const params = {
  media,
  ratings,
  stats,
  rank: { rank: 10, delta: 1, link: 'https://www.justwatch.com/us/movie/fight-club' },
  country: 'us',
  otherSiteRatings: true,
  earlyRatings: false,
  now: new Date('2026-09-30T00:00:00Z'),
};

describe('toMediaStats', () => {
  it('should use extended Trakt ratings, truncate the percent and keep API totals independent of the distribution', () => {
    const view = toMediaStats(params);
    expect(view).toMatchObject({ percent: 89, level: 8, votes: 2723 });
    expect(view.bars).toHaveLength(10);
    expect(view.bars.at(9)?.height).toBeCloseTo(105 / 121 * 100);
    expect(view.strip.rating).toEqual({ value: 8.999, votes: 2723, href: `${media.href}/stats` });
    expect(view.strip.external.map(({ title }) => title)).toEqual(['IMDb', 'Justwatch\n30 Day Streaming Rank']);
    expect(view.strip.counts.map(({ label }) => label)).toEqual([
      'watcher',
      'plays',
      'libraries',
      'comments',
      'lists',
      'favorited',
    ]);
  });

  it('should keep ten empty, finite bars when no one has voted', () => {
    const view = toMediaStats({ ...params, ratings: { rating: 0, votes: 0 } });
    expect(view.bars).toHaveLength(10);
    expect(view.bars.every(({ count, height, top }) => count === 0 && height === 0 && !top)).toBe(true);
  });

  it('should omit external ratings and favorites for seasons, and target the season for viewer writes', () => {
    const season: SubpageMedia = {
      ...media,
      item: { type: 'season', id: 3950, title: 'Breaking Bad Season 1', show: 1388, number: 1 },
      href: '/shows/breaking-bad/seasons/1',
    };
    const view = toMediaStats({ ...params, media: season });
    expect(view.strip.external).toEqual([]);
    expect(view.strip.counts.map(({ label }) => label)).not.toContain('favorited');
    expect(view.strip.ratingTarget).toEqual({ type: 'season', id: 3950, title: 'Breaking Bad Season 1' });
    expect(view.strip.counts.at(3)?.href).toBe(`${season.href}/comments`);
  });

  it('should honor early and other-site ratings settings without hiding the distribution', () => {
    const future = { ...media, released: '2027-01-01' };
    const view = toMediaStats({ ...params, media: future, otherSiteRatings: false });
    expect(view.strip.rating).toBeUndefined();
    expect(view.strip.external).toEqual([]);
    expect(view.bars).toHaveLength(10);
    expect(toMediaStats({ ...params, media: future, earlyRatings: true }).strip.rating).toBeDefined();
    expect(toMediaStats({ ...params, media: { ...media, released: undefined } }).strip.rating).toBeUndefined();
  });
});
