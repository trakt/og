/** Paths anyone can load while og is admin-only: the placeholder, and what signing in and out needs. */
const OPEN_PATHS = new Set(['/', '/auth/signin', '/callback', '/logout', '/api/store-token']);

const USERINFO = 'https://auth.trakt.tv/api/auth/oauth2/userinfo';

/** Whether the gate lets this path through for everyone. SvelteKit's `__data.json` requests count as their page. */
export function isOpenPath(pathname: string): boolean {
  if (pathname.startsWith('/_app/')) return true;

  return OPEN_PATHS.has(pathname.replace(/\/?__data\.json$/, '') || '/');
}

/**
 * Checks whether the token is authorized for the launch gate.
 * Any failure (no token, expired, network) is "not an admin".
 */
// ponytail: one userinfo call per gated request; cache by token hash if admin traffic ever matters.
export async function isAdmin({ token, fetch }: { token: string | null; fetch: typeof globalThis.fetch }) {
  if (token === null) return false;

  try {
    const response = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return false;

    const claims: unknown = await response.json();
    return (claims as { u?: { a?: unknown } } | null)?.u?.a === true;
  } catch {
    return false;
  }
}
