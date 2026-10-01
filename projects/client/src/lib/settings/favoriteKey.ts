/**
 * A favorite service's country and source. The API sends `us-netflix`; API also stores a bare `netflix` for the
 * viewer's own country, which `home` stands in for.
 */
export function favoriteKey(key: string, home: string): { readonly country: string; readonly source: string } {
  const at = key.indexOf('-');
  return at < 0 ? { country: home, source: key } : { country: key.slice(0, at), source: key.slice(at + 1) };
}
