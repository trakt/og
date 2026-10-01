import type { Version } from './Version.ts';

// Negative when a is older than b, positive when newer, 0 when equal.
export function compareVersions(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
