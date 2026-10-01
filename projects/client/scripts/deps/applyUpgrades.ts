import type { PackageJson } from './PackageJson.ts';
import type { Upgrade } from './Upgrade.ts';

const SECTIONS = ['dependencies', 'devDependencies'] as const;

// Writes each upgrade's exact spec into whichever section already pins the package.
export function applyUpgrades(packageJson: PackageJson, upgrades: ReadonlyArray<Upgrade>): PackageJson {
  const specs = new Map(upgrades.map(({ pin, to }) => [pin.key, `${pin.prefix}${to}`]));

  return SECTIONS.reduce<PackageJson>((next, section) => {
    const pins = next[section];
    if (!pins) return next;
    return {
      ...next,
      [section]: Object.fromEntries(Object.entries(pins).map(([key, spec]) => [key, specs.get(key) ?? spec])),
    };
  }, packageJson);
}
