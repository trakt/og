import { describe, expect, it } from 'vitest';
import { toFilterSources, watchNowOptions, watchNowTiles } from './watchNowFilter.ts';

const body = [{
  us: [
    {
      source: 'netflix',
      name: 'Netflix',
      cinema: false,
      color: '#e50914',
      images: { logo: 'media.trakt.tv/netflix.webp', channel: null },
    },
    { source: 'amc_plus_amazon', name: 'AMC+ (on Amazon)', cinema: false, color: '#000', images: { logo: null } },
    { source: 'tubi', name: 'Tubi TV (free)', cinema: false, color: '#fa382f', images: null },
    { source: 'fandango', name: 'Fandango', cinema: true, color: '#f60', images: null },
  ],
}];

const sources = toFilterSources(body, 'us');

describe('util: toFilterSources', () => {
  it("should keep one country's services and drop cinemas", () => {
    expect([...sources.keys()]).toEqual(['netflix', 'amc_plus_amazon', 'tubi']);
    expect(sources.get('netflix')).toEqual({
      name: 'Netflix',
      color: '#e50914',
      logo: 'https://media.trakt.tv/netflix.webp',
    });
  });

  it('should throw on a body it does not recognise', () => {
    expect(() => toFilterSources({ us: 'nope' }, 'us')).toThrow();
  });
});

describe('util: watchNowOptions', () => {
  it('should list bundles, then services sorted with their store as a tag', () => {
    expect(watchNowOptions({ sources, country: 'us', favorites: [] })).toEqual([
      {
        label: 'Bundles',
        options: [
          { value: 'any', label: 'Streaming Anywhere', tag: 'US' },
          { value: 'free', label: 'Streaming Free', tag: 'US' },
          { value: 'subscriptions', label: 'Streaming Subscriptions', tag: 'US' },
        ],
      },
      {
        label: 'Streaming Services',
        options: [
          { value: 'amc_plus_amazon', label: 'AMC+', tag: 'Amazon' },
          { value: 'netflix', label: 'Netflix' },
          { value: 'tubi', label: 'Tubi TV', tag: 'Free' },
        ],
      },
    ]);
  });

  it('should put favorites first, under All Favorites', () => {
    const [favorites, , services] = watchNowOptions({ sources, country: 'us', favorites: ['netflix'] });
    expect(favorites).toEqual({
      label: 'Your Favorites',
      options: [{ value: 'favorites', label: 'All Favorites' }, { value: 'netflix', label: 'Netflix' }],
    });
    expect(services?.options.map((option) => option.value)).toEqual(['amc_plus_amazon', 'tubi']);
  });
});

describe('util: watchNowTiles', () => {
  it('should show bundles first, expand favorites and skip unknown services', () => {
    const tiles = watchNowTiles({
      watchnow: ['netflix', 'favorites', 'free', 'gone'],
      sources,
      country: 'us',
      favorites: ['tubi', 'netflix'],
    });
    expect(tiles.map((tile) => [tile.kind, tile.id])).toEqual([
      ['bundle', 'free'],
      ['service', 'netflix'],
      ['service', 'tubi'],
    ]);
  });
});
