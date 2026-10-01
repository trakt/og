import { dashboardPrefs } from '../dashboard/dashboardPrefs.ts';
import { redirect } from '@sveltejs/kit';
import { loadWatchNowChoices } from './loadWatchNowChoices.ts';
import { toSettingsDraft } from './toSettingsDraft.ts';
import type { ViewerSettings } from './ViewerSettings.ts';

type Params = {
  fetch: typeof globalThis.fetch;
  locals: { token: string | null };
  parent: () => Promise<{ settings: ViewerSettings | null }>;
  url: URL;
  now?: Date;
  cookies?: { get(name: string): string | undefined };
};

/**
 * The General settings page. It edits the layout's `/users/settings`, and reads the Watch Now countries and the
 * services the panel shows. Logged out goes to sign in; a cookie the API refused renders the expired state while the
 * browser renews it.
 */
export async function loadSettings({ fetch, locals, parent, url, cookies, now = new Date() }: Params) {
  if (!locals.token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);
  const { settings } = await parent();
  const draft = toSettingsDraft(settings);
  const watchNow = draft
    ? await loadWatchNowChoices({ fetch, country: draft.watchNowCountry, favorites: draft.watchNowFavorites })
    : { countries: [], sources: {} };
  // The birthday's years count back from this one, as OG's did from the server's date.
  return {
    expired: settings === null,
    year: now.getUTCFullYear(),
    prefs: dashboardPrefs.read(cookies?.get(dashboardPrefs.COOKIE), settings?.user.ids.slug ?? ''),
    watchNow,
  };
}
