import { isAdmin, isOpenPath } from './lib/auth/adminGate.ts';
import { AUTH_COOKIE } from './lib/auth/authCookie.ts';
import { type Handle, redirect } from '@sveltejs/kit';

/**
 * Loaders call `api({ fetch: event.fetch, token: locals.token })`. The server never refreshes: a 401 renders logged-out.
 * Until launch, og.trakt.tv is admin-only: everyone else is sent to the placeholder at `/`.
 * Local dev and preview turn the gate off with `OG_ADMIN_GATE=off` in `.dev.vars`. A deploy never reads that file.
 * The page's `<html data-theme>` is the viewer's Dark Knight setting, which the root layout's load puts in
 * `locals.theme` before the page renders, so the first paint needs no script. Anyone else gets OG's light theme.
 */
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.token = event.cookies.get(AUTH_COOKIE) ?? null;

  const gated = event.platform?.env.OG_ADMIN_GATE !== 'off';
  if (gated && !isOpenPath(event.url.pathname) && !(await isAdmin({ token: event.locals.token, fetch }))) {
    redirect(302, '/');
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%og.theme%', event.locals.theme ?? 'light'),
  });
};
