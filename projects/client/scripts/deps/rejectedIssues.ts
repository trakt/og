import type { BumpReport } from './BumpReport.ts';
import type { RejectedIssue } from './RejectedIssue.ts';

const FENCE = '````'; // four, so a log line with three can't close it

// One `chore(deps): adopt <package> <version>` issue per rejected package, so an agent can pick up the migration.
// A package whose minor and major both failed gets one issue, for the major: adopting it covers both.
export function rejectedIssues(report: BumpReport): ReadonlyArray<RejectedIssue> {
  const byPackage = new Map(
    [...report.minor.rejected, ...report.major.rejected].map((upgrade) => [upgrade.pin.key, upgrade]),
  );

  return [...byPackage.values()].map(({ pin, to }) => {
    const titlePrefix = `chore(deps): adopt ${pin.key} `;
    return {
      titlePrefix,
      title: `${titlePrefix}${to}`,
      body: [
        `The weekly dependency bump (\`deps.yml\`) couldn't move \`${pin.key}\` from ${pin.version} to ${to}: install, lint, check, test or build failed with it applied, so it stays on its current pin.`,
        '',
        'Acceptance: `' + pin.key +
        "` is pinned to the newest release Deno allows, `deno task ci` is green, and any code the new version needs is changed in the same PR. If it can't move yet (an upstream package doesn't support it), add a hold with its reason in `scripts/deps/dependencyHolds.ts` instead.",
        '',
        '<details><summary>End of the failing log</summary>',
        '',
        FENCE,
        report.logs[`${pin.key}@${to}`] ?? '(no log)',
        FENCE,
        '',
        '</details>',
      ].join('\n'),
    };
  });
}
