import { describe, expect, it } from 'vitest';
import { toShowCatalog } from './toShowCatalog.ts';

const episode = (season: number, number: number, extra = {}) => ({
  ids: { trakt: season * 100 + number },
  season,
  number,
  title: `Episode ${number}`,
  first_aired: '2008-01-21T02:00:00.000Z',
  runtime: 47,
  ...extra,
});

describe('toShowCatalog', () => {
  it('should order seasons and episodes by number, specials first', () => {
    const catalog = toShowCatalog({
      id: 1388,
      fetchedAt: 3,
      body: [
        { number: 1, aired_episodes: 2, episodes: [episode(1, 2), episode(1, 1)] },
        { number: 0, aired_episodes: 1, episodes: [episode(0, 1)] },
      ],
    });

    expect(catalog.seasons.map(({ number }) => number)).toEqual([0, 1]);
    expect(catalog.seasons.at(1)?.episodes.map(({ number }) => number)).toEqual([1, 2]);
    expect(catalog.fetchedAt).toBe(3);
  });

  it('should keep the episode fields the progress rows read', () => {
    const catalog = toShowCatalog({
      id: 1,
      fetchedAt: 0,
      body: [{
        number: 1,
        title: 'Season 1',
        episodes: [
          episode(1, 1, {
            episode_type: 'series_premiere',
            overview: 'Walt cooks.',
            images: { screenshot: ['s.jpg'] },
          }),
        ],
      }],
    });

    expect(catalog.seasons.at(0)?.episodes.at(0)).toEqual({
      id: 101,
      season: 1,
      number: 1,
      numberAbs: undefined,
      title: 'Episode 1',
      overview: 'Walt cooks.',
      type: 'series_premiere',
      firstAired: '2008-01-21T02:00:00.000Z',
      runtime: 47,
      rating: undefined,
      screenshot: 's.jpg',
    });
  });

  it('should treat a season without episodes as empty', () => {
    expect(toShowCatalog({ id: 1, fetchedAt: 0, body: [{ number: 1 }] }).seasons.at(0)?.episodes).toEqual([]);
  });

  it('should throw on a body that is not a season list', () => {
    expect(() => toShowCatalog({ id: 1, fetchedAt: 0, body: { error: 'nope' } })).toThrow();
  });
});
