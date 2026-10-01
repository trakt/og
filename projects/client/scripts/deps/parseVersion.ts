import type { Version } from './Version.ts';

const STABLE = /^(\d+)\.(\d+)\.(\d+)$/;

// Only plain `x.y.z` counts. Anything with a pre-release or build tag is never a bump candidate.
export function parseVersion(value: string): Version | undefined {
  const match = STABLE.exec(value);
  if (!match) return undefined;
  const [, major = '', minor = '', patch = ''] = match;
  return [Number(major), Number(minor), Number(patch)];
}
