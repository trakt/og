import { redirect } from '@sveltejs/kit';
import type { ViewerSettings } from './ViewerSettings.ts';

type Params = {
  locals: { token: string | null };
  parent: () => Promise<{ settings: ViewerSettings | null }>;
  url: URL;
};

/**
 * The Sharing and Notifications tabs. Each edits the layout's `/users/settings`, so it reads nothing itself.
 * Logged out goes to sign in; a cookie the API refused renders the expired state while the browser renews it.
 */
export async function loadSettingsTab({ locals, parent, url }: Params) {
  if (!locals.token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);
  const { settings } = await parent();
  return { expired: settings === null };
}
