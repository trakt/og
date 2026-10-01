import type { z } from 'zod/v4';
import type { emailNotificationsSchema } from './emailNotificationsSchema.ts';
import type { NotificationsDraft } from './NotificationsDraft.ts';

/** What the Notifications tab shows. */
export type NotificationSettings = {
  readonly username: string;
  /** A private account's followers ask first, so its row reads "Someone wants to follow me". */
  readonly private: boolean;
  /** Read only: shown, never sent. */
  readonly email: Readonly<z.infer<typeof emailNotificationsSchema>>;
  readonly app: NotificationsDraft;
};
