import { settingsFixture } from './settingsFixture.ts';

/**
 * The fake viewer's `GET /users/settings?extended=sharing` as the Sharing and Notifications tabs read it, for the
 * specs and the `/_design/settings/*` demos. Some toggles are left out, as API leaves out the unsaved ones.
 */
export const sharingSettingsFixture = {
  ...settingsFixture,
  connections: { twitter: true, mastodon: false, tumblr: false, medium: false, slack: false },
  sharing_text: { watching: "I'm watching [item]!", watched: 'I just watched [item]', rated: '' },
  sharing: {
    email: { new_follower: true, comment_mention: true, comment_like: false, list_like: false, mir: true },
    app: {
      new_follower: false,
      comment_mention: true,
      comment_reply: true,
      comment_like: true,
      list_comment: true,
      list_like: false,
      pending_collaboration: true,
      weekly_digest: false,
      mir: true,
    },
    twitter: { profile_icon: true, show_rated: true },
  },
};
