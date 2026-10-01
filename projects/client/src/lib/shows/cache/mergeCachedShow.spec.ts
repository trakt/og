import { describe, expect, it } from 'vitest';
import type { CachedShow } from './CachedShow.ts';
import { mergeCachedShow } from './mergeCachedShow.ts';

const show = (overrides: Partial<CachedShow>): CachedShow => ({
  id: 1,
  slug: 'breaking-bad',
  title: 'Breaking Bad',
  genres: [],
  fetchedAt: 0,
  complete: false,
  ...overrides,
});

describe('mergeCachedShow', () => {
  it('should take the newer read when nothing is cached', () => {
    const next = show({ airedEpisodes: 62 });
    expect(mergeCachedShow(undefined, next)).toBe(next);
  });

  it('should keep the cached poster under a metadata-only read', () => {
    const cached = show({ poster: 'p.jpg', fanart: 'f.jpg', complete: true, airedEpisodes: 61 });
    const next = show({ airedEpisodes: 62, fetchedAt: 5 });

    expect(mergeCachedShow(cached, next)).toEqual({
      ...next,
      poster: 'p.jpg',
      fanart: 'f.jpg',
      complete: true,
    });
  });

  it('should not mark an incomplete record complete from a metadata-only read', () => {
    expect(mergeCachedShow(show({}), show({ fetchedAt: 5 })).complete).toBe(false);
  });

  it('should replace the images when the newer read has them', () => {
    const cached = show({ poster: 'old.jpg', complete: true });
    const next = show({ poster: undefined, complete: true });

    expect(mergeCachedShow(cached, next).poster).toBeUndefined();
  });
});
