import type { AllowScriptsMove } from './AllowScriptsMove.ts';
import type { BisectResult } from './BisectResult.ts';
import type { HeldPackage } from './HeldPackage.ts';

// Everything one bump run found, for the pull request and the follow-up issues.
export interface BumpReport {
  readonly minor: BisectResult;
  readonly major: BisectResult;
  readonly held: ReadonlyArray<HeldPackage>;
  readonly allowScripts: ReadonlyArray<AllowScriptsMove>;
  // The tail of each rejected bump's log, by `<package.json key>@<version>`.
  readonly logs: Readonly<Record<string, string>>;
}
