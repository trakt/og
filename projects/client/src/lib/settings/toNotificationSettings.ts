import { z } from 'zod/v4';
import { appNotificationsSchema } from './appNotificationsSchema.ts';
import { emailNotificationsSchema } from './emailNotificationsSchema.ts';
import type { NotificationSettings } from './NotificationSettings.ts';

// `sharing` (with extended=sharing) comes from the API, and @trakt/api's contract doesn't
// have it.
const schema = z.object({
  user: z.object({ username: z.string(), private: z.boolean().nullish() }),
  sharing: z.object({ email: emailNotificationsSchema.nullish(), app: appNotificationsSchema.nullish() }).nullish(),
});

/**
 * The Notifications tab's values from the layout's `/users/settings`, with OG's defaults for the toggles the viewer
 * never saved. Null for an unexpected shape.
 */
export function toNotificationSettings(settings: unknown): NotificationSettings | null {
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return null;
  const { user, sharing } = parsed.data;

  return {
    username: user.username,
    private: user.private === true,
    email: sharing?.email ?? emailNotificationsSchema.parse({}),
    app: sharing?.app ?? appNotificationsSchema.parse({}),
  };
}
