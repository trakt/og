import { describe, expect, it } from 'vitest';
import { toBuiltInListView } from './toBuiltInListView.ts';

const profile = { slug: 'sean', isPrivate: false };
const sort = { by: 'added', how: 'desc' } as const;

describe('toBuiltInListView', () => {
  it("should build the watchlist with OG's name, unranked, at its og URL", () => {
    const list = toBuiltInListView({ kind: 'watchlist', profile, id: 2106, commentCount: 0, itemCount: 12, sort });
    expect(list).toMatchObject({
      id: 2106,
      slug: 'watchlist',
      name: 'Watchlist',
      href: '/users/sean/watchlist',
      kind: 'watchlist',
      ownerSlug: 'sean',
      pills: [],
      isPublic: true,
      displayNumbers: false,
      allowComments: false,
      itemCount: 12,
      likeCount: 0,
      sort,
    });
  });

  it('should rank favorites and link comments once there are some', () => {
    const list = toBuiltInListView({
      kind: 'favorites',
      profile: { slug: 'sean', isPrivate: true },
      id: null,
      commentCount: 10,
      itemCount: 3,
      sort,
    });
    expect(list).toMatchObject({
      id: 0,
      name: 'Favorites',
      href: '/users/sean/favorites',
      isPublic: false,
      displayNumbers: true,
      allowComments: true,
      commentCount: 10,
    });
  });
});
