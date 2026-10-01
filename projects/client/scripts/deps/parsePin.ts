import { parseVersion } from './parseVersion.ts';
import type { Pin } from './Pin.ts';

const ALIAS = /^npm:((?:@[^/@]+\/)?[^@]+)@(.+)$/;

// Reads a package.json entry. Anything that isn't an exact stable pin (a range, a tag, a git or file spec,
// a pre-release) is left alone: it isn't the bump job's to move.
export function parsePin(key: string, spec: string): Pin | undefined {
  const alias = ALIAS.exec(spec);
  const registryName = alias ? alias[1] ?? '' : key;
  const version = alias ? alias[2] ?? '' : spec;
  if (!parseVersion(version)) return undefined;

  return { key, registryName, version, prefix: alias ? `npm:${registryName}@` : '' };
}
