import { z } from 'zod/v4';

/** Sends one JSON request to the API as the viewer. */
export type SettingsRequest = (path: string, method: 'PUT', body: unknown) => Promise<Response>;

export type SaveSettingsParams = {
  readonly request: SettingsRequest;
  /** A `PUT /users/settings` body (General's `SettingsBody`, or a Sharing or Notifications tab's), or null for none. */
  readonly body: Readonly<Record<string, unknown>> | null;
  readonly email: string | null;
  /** The picked avatar as a base64 data URI. */
  readonly avatar: string | null;
};

export type SaveSettingsResult = {
  /** Whether any call went through, so the page reloads the viewer's settings. */
  readonly saved: boolean;
  /** One message per failed call, for the "Your settings couldn't be saved!" alert. */
  readonly errors: readonly string[];
};

// API answers a refused save with `{ message }`.
const errorSchema = z.object({ message: z.string() });

const EXPIRED = 'Your session has expired. Sign in again to save your settings.';

async function message(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) return EXPIRED;
  const parsed = errorSchema.safeParse(await response.json().catch(() => null));
  return response.status === 400 && parsed.success ? parsed.data.message : fallback;
}

async function send(
  request: SettingsRequest,
  [path, body, fallback]: readonly [string, unknown, string],
): Promise<string | null> {
  try {
    const response = await request(path, 'PUT', body);
    return response.ok ? null : await message(response, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Saves the General form: the settings, then the email and the avatar, which the API takes as separate calls. Each
 * call runs even when an earlier one failed, so one bad field doesn't hold back the rest, as OG's single form didn't.
 */
export async function saveSettings({ request, body, email, avatar }: SaveSettingsParams): Promise<SaveSettingsResult> {
  const calls = [
    body && ['/users/settings', body, "Trakt couldn't save your settings. Please try again."] as const,
    email !== null &&
    ['/users/email', { account: { email } }, "Trakt couldn't change your email. Please try again."] as const,
    avatar !== null &&
    ['/users/avatar', { user: { avatar } }, "Trakt couldn't upload your avatar. Please try again."] as const,
  ].filter((call) => call !== null && call !== false);

  // One after another, so a renewed token from the first call is the one the next calls use.
  const results = await calls.reduce<Promise<ReadonlyArray<string | null>>>(
    async (done, call) => [...await done, await send(request, call)],
    Promise.resolve([]),
  );

  return {
    saved: results.some((result) => result === null),
    // An expired session fails every call the same way; say it once.
    errors: [...new Set(results.filter((result) => result !== null))],
  };
}
