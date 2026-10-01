import { describe, expect, it } from 'vitest';
import { toProfileUser } from './toProfileUser.ts';

const sean = {
  username: 'sean',
  private: false,
  deleted: false,
  name: 'Sean Rudford',
  vip: true,
  vip_ep: true,
  director: false,
  ids: { slug: 'sean', trakt: 2 },
  location: 'California',
  gender: 'male',
  age: 44,
  images: { avatar: { full: 'https://media.trakt.tv/images/users/000/000/002/avatars/large/f69ca213e8.jpg' } },
  vip_og: true,
  vip_years: 17,
  vip_cover_image: 'https://media.trakt.tv/images/shows/000/001/693/fanarts/full/0c025fb6d2.jpg',
  about: '  Huge tv nerd\n',
};

describe('toProfileUser', () => {
  it('should map a public profile', () => {
    expect(toProfileUser(sean)).toEqual({
      slug: 'sean',
      username: 'sean',
      displayName: 'Sean Rudford',
      firstName: 'Sean',
      avatarUrl: sean.images.avatar.full,
      isPrivate: false,
      isLocked: false,
      vip: { kind: 'vip', tag: { text: 'OG', title: 'Original VIP Member' }, years: 17 },
      location: 'California',
      gender: { icon: 'mars', title: 'Male' },
      age: 44,
      coverUrl: sean.vip_cover_image,
      about: 'Huge tv nerd',
    });
  });

  it('should fall back to the username and OG defaults', () => {
    const user = toProfileUser({
      ...sean,
      name: '',
      location: ' ',
      gender: null,
      age: null,
      vip_cover_image: null,
    });

    expect(user.displayName).toBe('sean');
    expect(user.firstName).toBe('sean');
    expect(user.location).toBe('Omicron Persei 8');
    expect(user.gender).toEqual({ icon: 'genderless', title: 'Unknown' });
    expect(user.age).toBeNull();
    expect(user.coverUrl).toBeNull();
  });

  it('should title-case the gender like OG', () => {
    expect(toProfileUser({ ...sean, gender: 'female' }).gender).toEqual({ icon: 'venus', title: 'Female' });
    expect(toProfileUser({ ...sean, gender: 'non_binary' }).gender).toEqual({
      icon: 'genderless',
      title: 'Non-binary',
    });
    expect(toProfileUser({ ...sean, gender: 'prefer_not_to_say' }).gender.title).toBe('Prefer Not To Say');
  });

  describe('for a private profile', () => {
    const locked = { username: 'morbo', private: true, deleted: false, ids: { slug: 'morbo', trakt: 706 } };

    it('should lock it when the API held the details back', () => {
      const user = toProfileUser(locked);

      expect(user.isLocked).toBe(true);
      expect(user.isPrivate).toBe(true);
      expect(user.displayName).toBe('morbo');
      expect(user.avatarUrl).toBe('https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png');
      expect(user.vip).toBeNull();
    });

    it('should not lock it for the owner or an approved follower', () => {
      const user = toProfileUser({ ...sean, private: true });

      expect(user.isLocked).toBe(false);
      expect(user.isPrivate).toBe(true);
    });
  });
});
