/**
 * A list summary read, or null for the empty 204 the worker sends for a list that's missing or not the viewer's to
 * see: the client can't parse it.
 */
export async function fetchListSummary<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request();
  } catch (cause) {
    if (cause instanceof SyntaxError) return null;
    throw cause;
  }
}
