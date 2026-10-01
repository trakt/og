/** Wraps `fetch` so every request carries `Authorization: Bearer <token>` when there is a token. */
export function authorizedFetch(baseFetch: typeof fetch, token: string | null | undefined): typeof fetch {
  if (!token) return baseFetch;

  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return baseFetch(input, { ...init, headers });
  };
}
