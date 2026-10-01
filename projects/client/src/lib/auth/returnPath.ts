/** The same-origin path to land on after login. Anything that isn't a local path falls back to `/`. */
export function returnPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';

  return value;
}
