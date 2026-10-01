/**
 * For specs: the worker's answer to a stale or bogus token on a native route, `Unauthorized` as plain text under a JSON
 * content type. A fresh response each call, since a body reads once.
 */
export function workerUnauthorized(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
