import type { AllowScriptsMove } from './AllowScriptsMove.ts';

interface SyncAllowScriptsParams {
  readonly allowScripts: ReadonlyArray<string>;
  // `npm` keys from deno.lock, e.g. `workerd@1.20260926.1` or `msw@2.15.0_typescript@6.0.3`.
  readonly lockedPackages: ReadonlyArray<string>;
}

interface SyncAllowScriptsResult {
  readonly allowScripts: ReadonlyArray<string>;
  readonly moved: ReadonlyArray<AllowScriptsMove>;
}

const ENTRY = /^npm:((?:@[^/@]+\/)?[^@]+)@(.+)$/;
const LOCKED = /^((?:@[^/@]+\/)?[^@]+)@([^_]+)/;

const lockedVersions = (lockedPackages: ReadonlyArray<string>, name: string) => [
  ...new Set(
    lockedPackages.flatMap((key) => {
      const match = LOCKED.exec(key);
      return match && match[1] === name ? [match[2] ?? ''] : [];
    }),
  ),
];

// Moves each allowScripts grant to the version the lockfile now resolves, so a bumped package that was already
// trusted keeps running its install script. It never adds a package: a new grant needs a human and the
// `allowlist-change` label (supply_chain.yml). An entry is left as is when the lockfile has zero or several
// versions of the package, since there's no single version to move it to.
export function syncAllowScripts({ allowScripts, lockedPackages }: SyncAllowScriptsParams): SyncAllowScriptsResult {
  const entries = allowScripts.map((entry) => {
    const match = ENTRY.exec(entry);
    if (!match) return { entry };

    const [, name = '', from = ''] = match;
    const versions = lockedVersions(lockedPackages, name);
    const to = versions.length === 1 ? versions[0] : undefined;
    if (!to || to === from) return { entry };

    return { entry: `npm:${name}@${to}`, move: { name, from, to } };
  });

  return {
    allowScripts: entries.map(({ entry }) => entry),
    moved: entries.flatMap(({ move }) => (move ? [move] : [])),
  };
}
