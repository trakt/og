import { compareVersions } from './compareVersions.ts';
import type { Hold } from './Hold.ts';
import type { Packument } from './Packument.ts';
import { parseVersion } from './parseVersion.ts';
import type { Targets } from './Targets.ts';
import type { Version } from './Version.ts';

interface PickTargetsParams {
  readonly current: string;
  readonly packument: Packument;
  readonly now: Date;
  // Same rule as deno.json's `minimumDependencyAge`: nothing younger is offered, so the pick always installs.
  readonly minimumAgeMinutes: number;
  readonly hold?: Hold;
}

interface Release {
  readonly name: string;
  readonly version: Version;
}

const MINUTE_MS = 60_000;

const newest = (releases: ReadonlyArray<Release>) =>
  releases.reduce<Release | undefined>(
    (best, release) => (!best || compareVersions(release.version, best.version) > 0 ? release : best),
    undefined,
  );

// Picks the newest release a package may move to, split into same-major and later-major, following these rules:
// stable only, not deprecated, old enough, never past the `latest` dist-tag, and never at or past a hold the pin is still below.
export function pickTargets({ current, packument, now, minimumAgeMinutes, hold }: PickTargetsParams): Targets {
  const from = parseVersion(current);
  if (!from) return {};

  const latest = parseVersion(packument['dist-tags']?.latest ?? '');
  const holdAt = hold ? parseVersion(hold.below) : undefined;
  // A pin someone already moved past its hold isn't held any more.
  const ceiling = holdAt && compareVersions(from, holdAt) < 0 ? holdAt : undefined;
  const cutoff = now.getTime() - minimumAgeMinutes * MINUTE_MS;

  const eligible = Object.entries(packument.versions ?? {})
    .filter(([, manifest]) => !manifest.deprecated)
    .filter(([name]) => Date.parse(packument.time?.[name] ?? '') <= cutoff)
    .flatMap(([name]) => {
      const version = parseVersion(name);
      return version ? [{ name, version }] : [];
    })
    .filter((release) => compareVersions(release.version, from) > 0)
    .filter((release) => !latest || compareVersions(release.version, latest) <= 0);

  const allowed = eligible.filter((release) => !ceiling || compareVersions(release.version, ceiling) < 0);
  const minor = newest(allowed.filter((release) => release.version[0] === from[0]));
  const major = newest(allowed.filter((release) => release.version[0] > from[0]));
  const blocked = newest(eligible.filter((release) => !allowed.includes(release)));

  return {
    ...(minor && { minor: minor.name }),
    ...(major && { major: major.name }),
    ...(blocked && { held: blocked.name }),
  };
}
