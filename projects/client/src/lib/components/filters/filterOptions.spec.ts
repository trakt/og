import { describe, expect, it } from 'vitest';
import { toCertificationOptions, toCodedOptions, toGenreOptions, toNetworkOptions } from './filterOptions.ts';

describe('util: filterOptions', () => {
  it('should map genres, languages and countries', () => {
    expect(toGenreOptions([{ name: 'Science Fiction', slug: 'science-fiction' }])).toEqual([
      { value: 'science-fiction', label: 'Science Fiction' },
    ]);
    expect(toCodedOptions([{ name: 'Japanese', code: 'ja' }])).toEqual([{ value: 'ja', label: 'Japanese' }]);
  });

  it('should take the US certifications', () => {
    const body = { us: [{ name: 'TV-MA', slug: 'tv-ma', description: 'Mature Audience Only' }], gb: [] };
    expect(toCertificationOptions(body)).toEqual([{ value: 'tv-ma', label: 'TV-MA' }]);
  });

  it('should list each network name once, sorted, tagged with its country', () => {
    const body = [
      { name: 'HBO', country: 'us', ids: { trakt: 1 } },
      { name: '', country: null },
      { name: ' ABC ', country: 'au' },
      { name: 'HBO', country: 'gb' },
      { name: 'hbo', country: 'ca' },
    ];
    expect(toNetworkOptions(body)).toEqual([
      { value: 'ABC', label: 'ABC', tag: 'AU' },
      { value: 'HBO', label: 'HBO', tag: 'US' },
    ]);
  });

  it('should throw on a body of the wrong shape', () => {
    expect(() => toGenreOptions({ genres: [] })).toThrow();
  });
});
