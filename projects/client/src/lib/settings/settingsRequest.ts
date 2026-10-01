import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { SettingsRequest } from './saveSettings.ts';

/**
 * The settings writes as JSON through `rawApiFetch`: `@trakt/api` has no contract for `/users/email`, and its
 * settings body lacks the username, the account keys and `display_dob`. In the browser, `fetch` is the
 * authenticated one, which renews a spent token and retries once.
 */
export function settingsRequest(fetch: typeof globalThis.fetch): SettingsRequest {
  return (path, method, body) =>
    rawApiFetch({
      fetch,
      path,
      init: { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    });
}
