import { describe, expect, it } from 'vitest';
import { commentItemOf } from './commentItemOf.ts';

const show = { ids: { trakt: 1388 }, title: 'Breaking Bad ', year: 2008, aired_episodes: 62 };

describe('util: commentItemOf', () => {
  it('should title movies with their year', () => {
    expect(commentItemOf({ type: 'movie', movie: { ids: { trakt: 7 }, title: 'Heat', year: 1995 } })).toEqual({
      type: 'movie',
      id: 7,
      title: 'Heat (1995)',
    });
  });

  it('should keep the aired episodes of shows and seasons', () => {
    expect(commentItemOf({ type: 'show', show })).toEqual({
      type: 'show',
      id: 1388,
      title: 'Breaking Bad',
      airedEpisodes: 62,
    });
    expect(commentItemOf({ type: 'season', show, season: { ids: { trakt: 3 }, number: 1, aired_episodes: 7 } }))
      .toEqual({ type: 'season', id: 3, title: 'Breaking Bad Season 1', show: 1388, number: 1, airedEpisodes: 7 });
    expect(commentItemOf({ type: 'season', show, season: { ids: { trakt: 2 }, number: 0 } })?.title).toBe(
      'Breaking Bad Specials',
    );
  });

  it("should title episodes like OG's full_title", () => {
    expect(
      commentItemOf({ type: 'episode', show, episode: { ids: { trakt: 9 }, season: 1, number: 1, title: 'Pilot' } }),
    ).toEqual({ type: 'episode', id: 9, title: 'Breaking Bad 1x01 "Pilot"', show: 1388, season: 1 });
    expect(commentItemOf({ type: 'episode', show, episode: { ids: { trakt: 8 }, season: 0, number: 2 } })?.title)
      .toBe('Breaking Bad Special 2');
  });

  it('should name lists, and skip what it does not know', () => {
    expect(commentItemOf({ type: 'list', list: { ids: { trakt: 5 }, name: 'Faves' } })).toEqual({
      type: 'list',
      id: 5,
      title: 'Faves',
    });
    expect(commentItemOf({ type: 'person' })).toBeUndefined();
    expect(commentItemOf({ type: 'episode', episode: { ids: { trakt: 9 }, season: 1, number: 1 } })).toBeUndefined();
  });
});
