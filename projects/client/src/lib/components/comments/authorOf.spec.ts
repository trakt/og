import type { CommentResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { authorOf } from './authorOf.ts';

const user = (overrides: Partial<CommentResponse['user']> = {}): CommentResponse['user'] => ({
  username: 'sean',
  private: false,
  deleted: false,
  name: 'Sean Rudford',
  vip: false,
  vip_ep: false,
  director: false,
  ids: { slug: 'sean', trakt: 1 },
  images: { avatar: { full: 'https://media.trakt.tv/images/users/avatar.jpg' } },
  ...overrides,
});

describe('util: authorOf', () => {
  it('should use the full name, the profile link and the avatar', () => {
    expect(authorOf(user())).toEqual({
      name: 'Sean Rudford',
      href: '/users/sean',
      slug: 'sean',
      avatar: 'https://media.trakt.tv/images/users/avatar.jpg',
      badge: null,
    });
  });

  it('should fall back to the username and OG placeholder avatar', () => {
    const author = authorOf(user({ name: '  ', images: null, private: true }));
    expect(author.name).toBe('sean');
    expect(author.avatar).toContain('/placeholders/medium/zoidberg.png');
  });

  it('should label staff as Director over VIP, and VIP executive producers', () => {
    expect(authorOf(user({ director: true, vip: true, vip_ep: true })).badge).toEqual({ kind: 'director' });
    expect(authorOf(user({ vip: true, vip_ep: true })).badge).toMatchObject({ kind: 'vip', tag: { text: 'EP' } });
  });

  it('should show deleted members as "Deleted" without a link', () => {
    expect(authorOf(user({ deleted: true }))).toEqual({
      name: 'Deleted',
      avatar: expect.stringContaining('zoidberg'),
      badge: null,
    });
  });
});
