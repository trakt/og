import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_AVATAR } from '../components/comments/authorOf.ts';
import { socialFeedFixture } from './socialFeedFixture.ts';
import type { SocialActivity } from './socialActivitySchema.ts';
import { toSocialPlay } from './toSocialPlay.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const rows = socialFeedFixture.rows(new Date('2026-09-30T12:00:00Z'));
const row = (id: number): SocialActivity => {
  const found = rows.find((activity) => activity.id === id);
  if (!found) throw new Error(`no fixture row ${id}`);
  return found;
};

describe('toSocialPlay', () => {
  describe('for episodes', () => {
    it('should say the show, the number and the quoted title, and the watched date', () => {
      const play = toSocialPlay(row(7001), datePreferences);

      expect(play.watched).toBe('Breaking Bad 5x14 "Ozymandias"');
      expect(play.fullTitle).toBe('Breaking Bad 5x14 Ozymandias');
      expect(play.href).toBe('/shows/breaking-bad/seasons/5/episodes/14');
      expect(play.date).toBe('Sep 30, 2026 11:00 AM');
    });

    it('should add the absolute number for anime and leave out a missing title', () => {
      expect(toSocialPlay(row(7004), datePreferences).watched).toBe(
        'One Piece 21x05 (897) "The Mysterious Wizard of Wano"',
      );
      expect(toSocialPlay(row(7006), datePreferences).watched).toBe('Game of Thrones 1x01');
    });

    it("should take the show's poster at thumb size", () => {
      const activity: SocialActivity = {
        ...row(7001),
        type: 'episode',
        episode: { ids: { trakt: 1 }, season: 1, number: 2 },
        show: {
          ids: { trakt: 2, slug: 'x' },
          title: 'X',
          images: { poster: ['media.trakt.tv/images/shows/000/000/002/posters/medium/abc.jpg.webp'] },
        },
      };

      expect(toSocialPlay(activity, datePreferences).image)
        .toBe('https://media.trakt.tv/images/shows/000/000/002/posters/thumb/abc.jpg.webp');
    });
  });

  describe('for movies', () => {
    it('should say the title and year', () => {
      const play = toSocialPlay(row(7002), datePreferences);

      expect(play.watched).toBe('The Dark Knight (2008)');
      expect(play.href).toBe('/movies/the-dark-knight-2008');
    });
  });

  describe('for members', () => {
    it('should use the display name, then the username, and the placeholder avatar', () => {
      expect(toSocialPlay(row(7001), datePreferences).member)
        .toEqual({ name: 'Ada Sample', href: '/users/sample-ada', avatar: PLACEHOLDER_AVATAR });
      expect(toSocialPlay(row(7002), datePreferences).member.name).toBe('sample-bo');
    });

    it('should name a deleted member "Deleted" with no link', () => {
      const activity = { ...row(7002), user: { username: 'gone', deleted: true, ids: { slug: null } } };

      expect(toSocialPlay(activity, datePreferences).member).toEqual({ name: 'Deleted', avatar: PLACEHOLDER_AVATAR });
    });
  });
});
