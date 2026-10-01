import { describe, expect, it } from 'vitest';
import { toListView } from './toListView.ts';

const list = {
  name: 'Heist Night',
  description: '  Crews and vaults.  ',
  privacy: 'link' as const,
  type: 'personal' as const,
  display_numbers: true,
  allow_comments: true,
  sort_by: 'added' as const,
  sort_how: 'desc' as const,
  item_count: 12,
  comment_count: 2,
  likes: 5,
  ids: { trakt: 44, slug: 'heist-night' },
  user: { username: 'Sean', ids: { slug: 'sean' } },
};

describe('toListView', () => {
  it('should map a link list as private with the link pill', () => {
    expect(toListView(list)).toEqual({
      id: 44,
      slug: 'heist-night',
      name: 'Heist Night',
      description: 'Crews and vaults.',
      href: '/users/sean/lists/heist-night',
      kind: 'personal',
      ownerSlug: 'sean',
      pills: ['Private'],
      shareLink: true,
      isPublic: false,
      displayNumbers: true,
      allowComments: true,
      itemCount: 12,
      likeCount: 5,
      commentCount: 2,
      sort: { by: 'added', how: 'desc' },
    });
  });

  it('should read friends-only as Following and leave a blank description out', () => {
    const view = toListView({ ...list, privacy: 'friends', description: ' ' });
    expect(view.pills).toEqual(['Following']);
    expect(view.description).toBeUndefined();
  });
});
