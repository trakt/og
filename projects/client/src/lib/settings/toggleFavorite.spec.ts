import { describe, expect, it } from 'vitest';
import { toggleFavorite } from './toggleFavorite.ts';

describe('toggleFavorite', () => {
  it('should add a service with its country', () => {
    expect(toggleFavorite({ favorites: ['us-hulu'], country: 'gb', source: 'netflix', home: 'us' })).toEqual([
      'us-hulu',
      'gb-netflix',
    ]);
  });

  it('should remove a picked service, even stored as a bare slug', () => {
    expect(toggleFavorite({ favorites: ['us-hulu', 'netflix'], country: 'us', source: 'netflix', home: 'us' }))
      .toEqual(['us-hulu']);
    expect(toggleFavorite({ favorites: ['us-hulu', 'gb-hulu'], country: 'gb', source: 'hulu', home: 'us' }))
      .toEqual(['us-hulu']);
  });
});
