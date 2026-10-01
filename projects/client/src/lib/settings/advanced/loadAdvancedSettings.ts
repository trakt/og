import { redirect } from '@sveltejs/kit';
import type { DatePreferences } from '../DatePreferences.ts';
import type { ViewerSettings } from '../ViewerSettings.ts';
import { toAccountLimits } from './toAccountLimits.ts';

type Params = {
  locals: { token: string | null };
  parent: () => Promise<{ settings: ViewerSettings | null; datePreferences: DatePreferences }>;
  url: URL;
  now?: Date;
};

/**
 * The Advanced tab. Everything it shows comes from the layout's `/users/settings`, so it reads nothing
 * itself. Logged out goes to sign in; a cookie the API refused renders the expired state while the browser renews it.
 */
export async function loadAdvancedSettings({ locals, parent, url, now = new Date() }: Params) {
  if (!locals.token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);
  const { settings, datePreferences } = await parent();
  return {
    expired: settings === null,
    vip: settings?.user.vip === true,
    limits: settings && toAccountLimits({ settings, now, datePreferences }),
  };
}
