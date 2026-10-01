import type { ListResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toSummaryList } from './toSummaryList.ts';

const list = (extra: Partial<ListResponse> = {}): ListResponse => ({
  name: 'Heist Night',
  description: ' Crews and vaults. ',
  privacy: 'public',
  share_link: '',
  type: 'personal',
  display_numbers: false,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
  item_count: 12,
  comment_count: 3,
  likes: 40,
  ids: { trakt: 7, slug: 'heist-night' },
  user: { username: 'sean', name: 'Sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 2 } },
  images: {
    posters: Array.from({ length: 7 }, (_, i) => `media.trakt.tv/images/movies/${i}/posters/medium/p.jpg.webp`),
  },
  ...extra,
});

describe('toSummaryList', () => {
  it('should map a personal list under its owner with five posters', () => {
    const row = toSummaryList(list());
    expect(row).toMatchObject({
      id: 7,
      href: '/users/sean/lists/heist-night',
      name: 'Heist Night',
      owner: { name: 'Sean', href: '/users/sean' },
      itemCount: 12,
      likeCount: 40,
      commentCount: 3,
      pills: [],
      description: 'Crews and vaults.',
    });
    expect(row.posters).toHaveLength(5);
    expect(row.posters.at(0)?.image).toBe('https://media.trakt.tv/images/movies/0/posters/thumb/p.jpg.webp');
  });

  it('should send official lists to their page with their pill', () => {
    expect(toSummaryList(list({ type: 'official', ids: { trakt: 9, slug: 'deadpool-collection' } })))
      .toMatchObject({ href: '/lists/official/deadpool-collection', pills: ['Official List'] });
  });

  it('should mark private and friends lists, and drop the comment count when comments are off', () => {
    expect(toSummaryList(list({ privacy: 'private', allow_comments: false })))
      .toMatchObject({ pills: ['Private'], commentCount: undefined });
    expect(toSummaryList(list({ privacy: 'friends' })).pills).toEqual(['Following']);
  });

  it("should send a watchlist and favorites to the owner's pages without likes", () => {
    expect(toSummaryList(list({ type: 'watchlist', name: 'My Watchlist' }))).toMatchObject({
      href: '/users/sean/watchlist',
      name: 'Watchlist',
      likeCount: undefined,
    });
    expect(toSummaryList(list({ type: 'favorites', name: 'Favorites' }))).toMatchObject({
      href: '/users/sean/favorites',
      name: 'Favorites',
      likeCount: undefined,
    });
  });
});
