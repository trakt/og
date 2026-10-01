import { describe, expect, it } from 'vitest';
import { syncService } from './syncService.ts';

const sources = new Map([
  ['netflix', { name: 'Netflix', color: '#e50914', logo: 'https://media.trakt.tv/netflix.webp' }],
  ['amazon_prime_video', { name: 'Prime Video', color: '#0978f9' }],
  ['plex', { name: 'Plex', color: '#000000', logo: 'https://media.trakt.tv/plex.webp' }],
]);

describe('syncService', () => {
  it("should name the app, or OG's Trakt Importer, when the sync has no source", () => {
    expect(syncService({ kind: 'younify', source: null, application: 'Streaming Scrobbler', sources }))
      .toEqual({ kind: 'name', name: 'Streaming Scrobbler' });
    expect(syncService({ kind: 'import', sources })).toEqual({ kind: 'name', name: 'Trakt Importer' });
  });

  it("should map Younify's service ids to Watch Now sources", () => {
    expect(syncService({ kind: 'younify', source: 'amazon', sources }))
      .toEqual({ kind: 'tile', slug: 'amazon_prime_video', source: { name: 'Prime Video', color: '#0978f9' } });
  });

  it('should use the Watch Now source for Plex and a country-prefixed source', () => {
    expect(syncService({ kind: 'plex', source: 'plex', sources })).toMatchObject({
      slug: 'plex',
      source: { name: 'Plex' },
    });
    expect(syncService({ kind: 'import', source: 'us-netflix', sources })).toMatchObject({ slug: 'netflix' });
  });

  it("should use OG's own logos for the importers", () => {
    expect(syncService({ kind: 'import', source: 'letterboxd', sources }))
      .toMatchObject({ kind: 'tile', source: { name: 'Letterboxd', color: '#1f2830', logo: expect.any(String) } });
    expect(syncService({ kind: 'import', source: 'imdb', sources })).toMatchObject({ source: { color: '#e8b706' } });
  });

  it("should show an unknown source's humanized name on a black tile, like API", () => {
    expect(syncService({ kind: 'import', source: 'trakt_json', sources }))
      .toEqual({ kind: 'tile', slug: 'trakt_json', source: { name: 'Trakt json', color: '#000' } });
  });
});
