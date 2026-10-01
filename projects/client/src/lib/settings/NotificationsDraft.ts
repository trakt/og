import type { z } from 'zod/v4';
import type { appNotificationsSchema } from './appNotificationsSchema.ts';

/** The Trakt Apps column as the Notifications form's checkboxes hold it. Mutable because the form binds to it. */
export type NotificationsDraft = z.infer<typeof appNotificationsSchema>;
