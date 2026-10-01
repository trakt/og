import { appNotificationsSchema } from './appNotificationsSchema.ts';
import type { NotificationsDraft } from './NotificationsDraft.ts';

/** The Notifications tab's `PUT /users/settings` body: only the Trakt Apps toggles that changed. */
export type NotificationsBody = { readonly sharing: { readonly app: Readonly<Partial<NotificationsDraft>> } };

const KEYS = appNotificationsSchema.keyof().options;

/** What the form has to send to turn `before` (the saved toggles) into `after` (the form), or null for nothing. */
export function toNotificationsPatch(
  { before, after }: { before: NotificationsDraft; after: NotificationsDraft },
): NotificationsBody | null {
  const changed = KEYS.filter((key) => after[key] !== before[key]);
  if (!changed.length) return null;
  return { sharing: { app: Object.fromEntries(changed.map((key) => [key, after[key]])) } };
}
