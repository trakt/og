import { describe, expect, it } from 'vitest';
import { watchedIndicator } from './watchedIndicator.ts';

const stats = (play_count: number, completed_count = 0) => ({ rating: null, play_count, completed_count });

describe('util: watchedIndicator', () => {
  it('should show nothing when the author has no plays', () => {
    expect(watchedIndicator({ stats: stats(0), slug: 'sean', item: { type: 'movie', id: 1, title: 'Heat' } }))
      .toBeUndefined();
  });

  it('should count plays on movies and episodes, and link to the history', () => {
    expect(watchedIndicator({ stats: stats(1), slug: 'sean', item: { type: 'movie', id: 7, title: 'Heat' } }))
      .toEqual({ count: '1', label: 'play', href: '/users/sean/history?movie=7' });
    expect(
      watchedIndicator({
        stats: stats(1200),
        slug: 'sean',
        item: { type: 'episode', id: 9, title: 'Pilot', show: 1, season: 1 },
      }),
    ).toMatchObject({ count: '1,200', label: 'plays', href: '/users/sean/history?episode=9' });
  });

  it('should show a floored percentage of aired episodes on shows and seasons, capped at 100', () => {
    const item = { type: 'show', id: 3, title: 'Breaking Bad', airedEpisodes: 62 } as const;
    expect(watchedIndicator({ stats: stats(70, 31), slug: 'sean', item })).toEqual({
      count: '50%',
      label: 'Watched',
      title: '31/62 episodes\n70 plays',
      href: '/users/sean/history?show=3',
    });
    expect(watchedIndicator({ stats: stats(70, 80), slug: 'sean', item })?.count).toBe('100%');
  });

  it('should fall back to plays when the percentage rounds to 0 or the aired count is unknown', () => {
    const season = { type: 'season', id: 4, title: 'Season 1', show: 3, number: 1 } as const;
    expect(watchedIndicator({ stats: stats(2, 0), slug: 'sean', item: { ...season, airedEpisodes: 7 } })).toMatchObject(
      {
        count: '2',
        label: 'plays',
        title: '0/7 episodes\n2 plays',
      },
    );
    expect(watchedIndicator({ stats: stats(2, 2), slug: 'sean', item: season })?.label).toBe('plays');
  });

  it('should show nothing on lists', () => {
    expect(watchedIndicator({ stats: stats(3), slug: 'sean', item: { type: 'list', id: 1, title: 'Faves' } }))
      .toBeUndefined();
  });
});
