import { describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { toBuiltInRow } from './toBuiltInRow.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const poster = (name: string) => ({ images: { poster: [`media.trakt.tv/${name}/posters/medium/p.jpg.webp`] } });

describe('toBuiltInRow', () => {
  it('should title each poster and use the show poster for seasons and episodes', () => {
    const row = toBuiltInRow({
      kind: 'watchlist',
      profile,
      itemCount: 315,
      items: [
        { type: 'movie', movie: { title: 'Heat', ...poster('heat') } },
        { type: 'show', show: { title: 'Severance', ...poster('severance') } },
        { type: 'season', show: { title: 'Lost', ...poster('lost') }, season: { number: 2, images: null } },
        { type: 'episode', show: { title: 'Lost', ...poster('lost') }, episode: { title: 'Pilot' } },
      ],
    });
    expect(row.posters).toEqual([
      { title: 'Heat', image: 'https://media.trakt.tv/heat/posters/thumb/p.jpg.webp' },
      { title: 'Severance', image: 'https://media.trakt.tv/severance/posters/thumb/p.jpg.webp' },
      { title: 'Lost Season 2', image: 'https://media.trakt.tv/lost/posters/thumb/p.jpg.webp' },
      { title: 'Lost: Pilot', image: 'https://media.trakt.tv/lost/posters/thumb/p.jpg.webp' },
    ]);
  });

  it('should name the row, link it and leave out likes, comments and the description', () => {
    const row = toBuiltInRow({ kind: 'favorites', profile, itemCount: 51, items: [] });
    expect(row).toMatchObject({
      key: 'favorites',
      id: null,
      kind: 'favorites',
      name: 'Favorites',
      href: '/users/tester/favorites',
      owner: { slug: 'tester', name: 'Tester', href: '/users/tester' },
      itemCount: 51,
    });
    expect([row.likeCount, row.commentCount, row.description]).toEqual([undefined, undefined, undefined]);
    expect(toBuiltInRow({ kind: 'watchlist', profile, itemCount: 0, items: [] }).name).toBe('Watchlist');
  });
});
