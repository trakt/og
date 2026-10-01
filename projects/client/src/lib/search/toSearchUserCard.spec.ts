import { describe, expect, it } from 'vitest';
import { searchUsersSchema } from './searchUsersSchema.ts';
import { toSearchUserCard } from './toSearchUserCard.ts';

const AVATAR = 'https://media.trakt.tv/images/users/000/000/002/avatars/large/abc.jpg';
const COVER = 'https://media.trakt.tv/images/shows/000/001/693/fanarts/full/def.jpg';

const user = (fields: object) =>
  searchUsersSchema.parse([{
    type: 'user',
    score: 0,
    user: { username: 'sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 2 }, ...fields },
  }]).at(0)?.user ?? { username: '', private: false, ids: {} };

describe('toSearchUserCard', () => {
  it('should title the card with the display name and use the avatar and VIP cover', () => {
    const card = toSearchUserCard(user({
      name: 'Sean',
      vip: true,
      images: { avatar: { full: AVATAR } },
      vip_cover_image: COVER,
    }));

    expect(card).toEqual({
      key: 'sean',
      href: '/users/sean',
      title: 'Sean',
      avatar: AVATAR,
      cover: COVER,
      tags: [{ text: 'VIP' }],
    });
  });

  it('should fall back to the username, the placeholder avatar and no cover', () => {
    const card = toSearchUserCard(user({ name: '  ', vip_cover_image: null }));

    expect(card).toMatchObject({
      title: 'sean',
      avatar: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
      cover: null,
      tags: [],
    });
  });

  describe('for the tag', () => {
    it('should read VIP EP for an executive producer', () => {
      expect(toSearchUserCard(user({ vip: true, vip_ep: true })).tags).toEqual([{ text: 'VIP EP' }]);
    });

    it('should read Director for staff, over any VIP tag', () => {
      expect(toSearchUserCard(user({ vip: true, vip_ep: true, director: true })).tags).toEqual([{ text: 'Director' }]);
    });

    it('should leave out the OG tag, which search never showed', () => {
      expect(toSearchUserCard(user({ vip: true, vip_og: true })).tags).toEqual([{ text: 'VIP' }]);
    });
  });
});
