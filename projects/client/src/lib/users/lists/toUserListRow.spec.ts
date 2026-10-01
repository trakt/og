import { describe, expect, it } from 'vitest';
import { toUserListRow } from './toUserListRow.ts';

const list = (overrides: Record<string, unknown> = {}) => ({
  name: 'Heist Night',
  description: '  Crews, vaults and **one last job**.  ',
  privacy: 'public',
  type: 'personal',
  allow_comments: true,
  updated_at: '2026-09-28T21:22:23.000Z',
  item_count: 12,
  comment_count: 3,
  likes: 7,
  ids: { trakt: 42, slug: 'heist-night' },
  user: {
    username: 'og_tester',
    name: ' OG Tester ',
    ids: { slug: 'og_tester' },
    vip: true,
    vip_ep: true,
    images: { avatar: { full: 'https://media.trakt.tv/avatar.jpg' } },
  },
  images: { posters: ['media.trakt.tv/images/a/posters/medium/1.jpg.webp', 'b', 'c', 'd', 'e', 'f'] },
  ...overrides,
});

describe('toUserListRow', () => {
  it('should map a public personal list under its owner', () => {
    expect(toUserListRow(list(), 3)).toEqual({
      key: 'list-42',
      id: 42,
      kind: 'personal',
      href: '/users/og_tester/lists/heist-night',
      name: 'Heist Night',
      owner: {
        slug: 'og_tester',
        name: 'OG Tester',
        href: '/users/og_tester',
        avatar: 'https://media.trakt.tv/avatar.jpg',
        vip: { kind: 'vip', tag: { text: 'EP', title: 'Executive Producer' }, years: null },
      },
      posters: [
        { image: 'https://media.trakt.tv/images/a/posters/thumb/1.jpg.webp' },
        { image: 'https://b' },
        { image: 'https://c' },
        { image: 'https://d' },
        { image: 'https://e' },
      ],
      itemCount: 12,
      likeCount: 7,
      commentCount: 3,
      pills: [],
      shareLink: false,
      isPublic: true,
      description: 'Crews, vaults and **one last job**.',
      updatedAt: '2026-09-28T21:22:23.000Z',
      rank: 3,
    });
  });

  it('should pill private, link and friends-only lists like OG', () => {
    expect(toUserListRow(list({ privacy: 'private' }), 1)).toMatchObject({ pills: ['Private'], shareLink: false });
    expect(toUserListRow(list({ privacy: 'link' }), 1)).toMatchObject({ pills: ['Private'], shareLink: true });
    expect(toUserListRow(list({ privacy: 'friends' }), 1)).toMatchObject({ pills: ['Following'], isPublic: false });
  });

  it('should send official lists to their own page', () => {
    expect(toUserListRow(list({ type: 'official' }), 1)).toMatchObject({
      kind: 'official',
      href: '/lists/official/heist-night',
      pills: ['Official List'],
    });
  });

  it('should hide the comment count when comments are off and fill in a missing owner', () => {
    const row = toUserListRow(
      list({ allow_comments: false, description: ' ', user: { username: 'Sean', ids: {}, images: null } }),
      1,
    );
    expect(row).toMatchObject({
      commentCount: undefined,
      description: undefined,
      owner: { slug: 'Sean', name: 'Sean', href: '/users/Sean', vip: null },
    });
    expect(row.owner.avatar).toContain('zoidberg');
  });
});
