import { describe, expect, it } from 'vitest';
import { subpageWatchNowPath } from './subpageWatchNowPath.ts';

const show = { ids: { trakt: 1, slug: 'breaking-bad' }, title: 'Breaking Bad' };

describe('subpageWatchNowPath', () => {
  it('should look up a movie by its slug', () => {
    const movie = { ids: { trakt: 2, slug: 'heat-1995' }, title: 'Heat' };
    expect(subpageWatchNowPath({ type: 'movie', movie })).toEqual({ path: '/movies/heat-1995' });
  });

  it('should fall back to the first episode of a show or season', () => {
    expect(subpageWatchNowPath({ type: 'show', show })).toEqual({
      path: '/shows/breaking-bad',
      fallback: '/shows/breaking-bad/seasons/1/episodes/1',
    });
    expect(subpageWatchNowPath({ type: 'season', show, season: { ids: { trakt: 3 }, number: 2 } })).toEqual({
      path: '/shows/breaking-bad/seasons/2',
      fallback: '/shows/breaking-bad/seasons/2/episodes/1',
    });
  });

  it('should look up an episode by its numbers', () => {
    const episode = { ids: { trakt: 4 }, season: 3, number: 7 };
    expect(subpageWatchNowPath({ type: 'episode', show, episode })).toEqual({
      path: '/shows/breaking-bad/seasons/3/episodes/7',
    });
  });

  it('should have none for lists or a missing item', () => {
    const list = { ids: { trakt: 5, slug: 'mcu' }, name: 'MCU' };
    expect(subpageWatchNowPath({ type: 'list', list })).toBeUndefined();
    expect(subpageWatchNowPath({ type: 'movie' })).toBeUndefined();
  });
});
