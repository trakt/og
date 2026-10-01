import { describe, expect, it } from 'vitest';
import { mediaSpoilers } from './mediaSpoilers.ts';

describe('mediaSpoilers', () => {
  it('should protect every requested episode field before watched state is known', () => {
    expect(mediaSpoilers({ type: 'episode', spoilers: { episodes: 'hide', ratings: 'hide' } })).toEqual({
      title: true,
      overview: true,
      screenshot: true,
      rating: true,
    });
  });
  it.each([
    ['hide_overviews', false, true, false],
    ['hide_screenshots_overviews', false, true, true],
    ['show', false, false, false],
  ])('should honor the episode mode %s independently from ratings', (mode, title, overview, screenshot) => {
    expect(mediaSpoilers({ type: 'episode', spoilers: { episodes: mode, ratings: 'hide' }, watched: false }))
      .toEqual({ title, overview, screenshot, rating: true });
  });
  it.each(['movie', 'show', 'season'] as const)('should hide only overview and ratings on an unwatched %s', (type) => {
    expect(mediaSpoilers({ type, spoilers: { movies: 'hide', shows: 'hide', ratings: 'hide' }, watched: false }))
      .toEqual({ title: false, overview: true, screenshot: false, rating: true });
  });
  it.each(['movie', 'show', 'season', 'episode'] as const)('should reveal watched %s items', (type) => {
    expect(
      mediaSpoilers({
        type,
        spoilers: { episodes: 'hide', movies: 'hide', shows: 'hide', ratings: 'hide' },
        watched: true,
      }),
    )
      .toEqual({ title: false, overview: false, screenshot: false, rating: false });
  });
  it('should leave logged-out preferences and people unprotected', () => {
    expect(Object.values(mediaSpoilers({ type: 'episode' })).every((hidden) => !hidden)).toBe(true);
    expect(
      Object.values(mediaSpoilers({ type: 'person', spoilers: { shows: 'hide', ratings: 'hide' } })).every((hidden) =>
        !hidden
      ),
    ).toBe(true);
  });
});
