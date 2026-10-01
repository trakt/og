// The one check-in modal: the summary button and the poster popover open it, <CheckinDialog /> in the root layout
// renders it. Call it from interactions only: this module is shared by every request on the server.
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { login } from '../../auth/login.ts';
import { userManager } from '../../auth/userManager.ts';
import { toast } from '../toast/toast.svelte.ts';
import type { CheckinTarget } from './CheckinTarget.ts';
import { loadCheckinTarget } from './loadCheckinTarget.ts';

let target = $state<CheckinTarget | null>(null);

export const checkin = {
  get target() {
    return target;
  },
  /** Logged out, it sends the viewer to sign in instead, like OG. */
  async open(item: Pick<CheckinTarget, 'type' | 'id'>): Promise<void> {
    if (!(await userManager().getUser())?.access_token) return login();
    const loaded = await loadCheckinTarget({ ...item, fetch: (path) => rawApiFetch({ path }) }).catch(() => null);
    if (loaded) target = loaded;
    else toast.error('Doh! We ran into some sort of error.');
  },
  close() {
    target = null;
  },
};
