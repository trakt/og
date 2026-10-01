import { describe, expect, it } from 'vitest';
import { searchUsersSchema } from '../../search/searchUsersSchema.ts';
import { toSearchUserRow } from './toSearchUserRow.ts';

const AVATAR = 'https://media.trakt.tv/images/users/000/000/002/avatars/large/abc.jpg';

const user = (fields: object) =>
  searchUsersSchema.parse([{
    type: 'user',
    score: 0,
    user: { username: 'sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 2 }, ...fields },
  }]).at(0)?.user ?? { username: '', private: false, ids: {} };

describe('toSearchUserRow', () => {
  it('should draw the display name, the round avatar and a User tag', () => {
    const row = toSearchUserRow(user({ name: 'Sean Rudford', vip: true, images: { avatar: { full: AVATAR } } }));

    expect(row).toEqual({
      key: 'user-sean',
      recent: { query: 'Sean Rudford', type: 'users', id: 2 },
      href: '/users/sean',
      title: 'Sean Rudford',
      type: 'User',
      poster: AVATAR,
      avatar: true,
    });
  });

  it('should fall back to the username and the placeholder avatar', () => {
    const row = toSearchUserRow(user({ name: null }));

    expect(row).toMatchObject({
      title: 'sean',
      recent: { query: 'sean' },
      poster: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
    });
  });

  it('should give a user without a Trakt id no recent id, which recording skips', () => {
    const row = toSearchUserRow(user({ ids: { slug: 'sean' } }));

    expect(row.recent.id).toBe(0);
  });
});
