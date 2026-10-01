import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { userManager } from '../auth/userManager.ts';
import { saveSettings, type SaveSettingsResult } from './saveSettings.ts';
import { settingsRequest } from './settingsRequest.ts';

/**
 * Sends a settings tab's `PUT /users/settings` body (null sends nothing) as the signed-in viewer. The authenticated
 * fetch renews a spent token and retries once.
 */
export function saveSettingsBody(body: Readonly<Record<string, unknown>> | null): Promise<SaveSettingsResult> {
  return saveSettings({
    request: settingsRequest(authenticatedFetch({ manager: userManager() })),
    body,
    email: null,
    avatar: null,
  });
}
