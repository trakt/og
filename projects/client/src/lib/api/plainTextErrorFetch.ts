const parses = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * A fetch for the typed client that relabels the worker's plain-text error bodies ("Unauthorized", "List is private or
 * does not exist") as text. The worker sends them under a JSON content type, so the client's `JSON.parse` throws and
 * the status is lost; relabeled, the client returns the status for the caller to check.
 */
export function plainTextErrorFetch(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    if (response.ok || !response.headers.get('content-type')?.includes('json')) return response;
    const text = await response.clone().text();
    if (!text || parses(text)) return response;
    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/plain; charset=utf-8');
    return new Response(text, { status: response.status, statusText: response.statusText, headers });
  };
}
