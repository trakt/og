import { userManager } from './userManager.ts';

/** Sends the browser to auth.trakt.tv. `/callback` lands it back on `returnTo`. */
export function login(returnTo: string = location.pathname + location.search): Promise<void> {
  return userManager().signinRedirect({ state: { returnTo } });
}
