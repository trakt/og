import { describe, expect, it } from 'vitest';
import { type ListRowSource, toListRow } from './toListRow.ts';

const list = (extra: Partial<ListRowSource> = {}): ListRowSource => ({
  name: 'Heist Night',
  description: ' Crews and vaults. ',
  privacy: 'public',
  type: 'personal',
  allow_comments: true,
  item_count: 12,
  comment_count: 3,
  likes: 40,
  ids: { trakt: 7, slug: 'heist-night' },
  user: { username: 'sean', name: ' Sean ', ids: { slug: 'sean' }, images: { avatar: { full: 'https://a.jpg' } } },
  images: { posters: ['a', 'b', 'c', 'd', 'e', 'f'] },
  ...extra,
});

describe('toListRow', () => {
  it('should map a personal list under its owner with five posters', () => {
    expect(toListRow(list())).toEqual({
      key: 'list-7',
      id: 7,
      kind: 'personal',
      href: '/users/sean/lists/heist-night',
      name: 'Heist Night',
      owner: { slug: 'sean', name: 'Sean', href: '/users/sean', avatar: 'https://a.jpg' },
      posters: ['a', 'b', 'c', 'd', 'e'].map((path) => ({ image: `https://${path}` })),
      itemCount: 12,
      likeCount: 40,
      commentCount: 3,
      pills: [],
      description: 'Crews and vaults.',
    });
  });

  it('should link an official list to its page', () => {
    const official = list({ type: 'official', ids: { trakt: 9, slug: 'deadpool-collection' } });
    expect(toListRow(official)).toMatchObject({ kind: 'official', href: '/lists/official/deadpool-collection' });
    expect(toListRow(official).pills).toEqual(['Official List']);
  });

  it('should link an official list without a slug by its id, which the page redirects to its slug', () => {
    expect(toListRow(list({ type: 'official', ids: { trakt: 9, slug: null } })).href).toBe('/lists/official/9');
  });

  it("should send a watchlist and favorites to the owner's pages without likes", () => {
    expect(toListRow(list({ type: 'watchlist', name: 'My Watchlist' }))).toMatchObject({
      kind: 'watchlist',
      href: '/users/sean/watchlist',
      name: 'Watchlist',
      likeCount: undefined,
    });
    expect(toListRow(list({ type: 'favorites' }))).toMatchObject({
      href: '/users/sean/favorites',
      likeCount: undefined,
    });
  });

  it('should treat a missing or unknown type as personal', () => {
    expect(toListRow(list({ type: null })).kind).toBe('personal');
    expect(toListRow(list({ type: 'all' })).kind).toBe('personal');
  });

  it('should fill in what the API left out', () => {
    const row = toListRow(list({
      description: ' ',
      allow_comments: null,
      comment_count: null,
      likes: null,
      ids: { trakt: 7, slug: null },
      user: { username: 'Sean', ids: {}, images: null },
      images: null,
    }));
    expect(row).toMatchObject({
      href: '/users/Sean/lists/7',
      owner: { slug: 'Sean', name: 'Sean', href: '/users/Sean' },
      posters: [],
      likeCount: 0,
      commentCount: undefined,
      description: undefined,
    });
    expect(row.owner.avatar).toContain('zoidberg');
  });

  it('should count comments as zero when they are on but uncounted', () => {
    expect(toListRow(list({ comment_count: null })).commentCount).toBe(0);
  });
});
