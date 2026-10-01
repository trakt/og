import { AUTH_COOKIE } from '../../../lib/auth/authCookie.ts';
import type { RequestHandler } from '@sveltejs/kit';

type StoredToken = { token: string; expiresAt: number };

function parseStoredToken(body: unknown, now: number): StoredToken | null {
  if (typeof body !== 'object' || body === null) return null;
  if (!('token' in body) || typeof body.token !== 'string' || body.token === '') return null;
  if (!('expiresAt' in body) || typeof body.expiresAt !== 'number' || body.expiresAt <= now) return null;

  return { token: body.token, expiresAt: body.expiresAt };
}

/**
 * Sets the httpOnly cookie loaders read. The browser POSTs `{ token, expiresAt }` after login and every renewal.
 * Anything else, including `{ token: null }` on logout, clears it. SvelteKit's CSRF check rejects cross-site form posts.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
  const stored = parseStoredToken(await request.json().catch(() => null), Date.now());

  if (!stored) {
    cookies.delete(AUTH_COOKIE, { path: '/' });
    return new Response(null, { status: 204 });
  }

  cookies.set(AUTH_COOKIE, stored.token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires: new Date(stored.expiresAt),
  });
  return new Response(null, { status: 204 });
};
