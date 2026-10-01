import { describe, expect, it } from 'vitest';
import { sharingSettingsFixture } from './sharingSettingsFixture.ts';
import { toNotificationSettings } from './toNotificationSettings.ts';

describe('toNotificationSettings', () => {
  it('should read both columns and fill the unsaved email toggles with OG defaults', () => {
    expect(toNotificationSettings(sharingSettingsFixture)).toEqual({
      username: 'og_tester',
      private: false,
      email: {
        new_follower: true,
        comment_mention: true,
        comment_reply: true,
        comment_like: false,
        list_comment: true,
        list_like: false,
        pending_collaboration: true,
        weekly_digest: true,
        mir: true,
        streaming_optimizations: true,
      },
      app: sharingSettingsFixture.sharing.app,
    });
  });

  it('should leave new followers off by email and turn every Trakt Apps toggle on when nothing was saved', () => {
    const settings = toNotificationSettings({ user: { username: 'someone', private: true } });

    expect(settings?.private).toBe(true);
    expect(settings?.email.new_follower).toBe(false);
    expect(Object.values(settings?.email ?? {}).filter((value) => !value)).toHaveLength(1);
    expect(Object.values(settings?.app ?? {}).every(Boolean)).toBe(true);
  });

  it('should ignore the other channels', () => {
    expect(toNotificationSettings(sharingSettingsFixture)?.app).not.toHaveProperty('profile_icon');
  });

  it('should return null for an unexpected shape', () => {
    expect(toNotificationSettings(null)).toBeNull();
    expect(toNotificationSettings({ user: { username: 'someone' }, sharing: { app: { mir: 'yes' } } })).toBeNull();
  });
});
