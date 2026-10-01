import { describe, expect, it } from 'vitest';
import { favoriteServices } from './favoriteServices.ts';

const service = (name: string) => ({ name, color: '#000', logo: `https://media.trakt.tv/${name}.webp` });
const sources = {
  us: new Map([['netflix', service('Netflix')], ['hulu', service('Hulu')], ['max', service('Max')]]),
  gb: new Map([['bbc_iplayer', service('BBC iPlayer')], ['netflix', service('Netflix')]]),
};

describe('favoriteServices', () => {
  it("should sort by source, group by country, and badge another country's services", () => {
    const tiles = favoriteServices({
      favorites: ['us-netflix', 'gb-netflix', 'us-hulu', 'gb-bbc_iplayer'],
      country: 'us',
      sources,
      vip: false,
    });
    expect(tiles.map(({ key, country }) => [key, country])).toEqual([
      ['gb-bbc_iplayer', 'GB'],
      ['gb-netflix', 'GB'],
      ['us-hulu', undefined],
      ['us-netflix', undefined],
    ]);
    expect(tiles[0]?.link).toMatchObject({ name: 'BBC iPlayer', href: '' });
  });

  it("should link a VIP's tiles to search, with the country for another country's", () => {
    const tiles = favoriteServices({ favorites: ['us-max', 'gb-bbc_iplayer'], country: 'us', sources, vip: true });
    expect(tiles.map(({ link }) => link.href)).toEqual(['/search?watchnow=gb-bbc_iplayer', '/search?watchnow=max']);
  });

  it("should read a bare slug as the viewer's country and skip services it can't show", () => {
    const tiles = favoriteServices({
      favorites: ['hulu', 'us-gone', 'fr-canal_plus', 'hulu'],
      country: 'us',
      sources,
      vip: false,
    });
    expect(tiles.map(({ key }) => key)).toEqual(['hulu']);
  });
});
