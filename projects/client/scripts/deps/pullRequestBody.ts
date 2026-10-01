import type { BumpReport } from './BumpReport.ts';
import type { Upgrade } from './Upgrade.ts';

const upgradeLine = ({ pin, to }: Upgrade) => `- \`${pin.key}\` ${pin.version} → ${to}`;

const section = (heading: string, lines: ReadonlyArray<string>) =>
  lines.length > 0 ? [`# ${heading}`, '', ...lines, ''] : [];

// The weekly bump pull request's description, in markdown.
export function pullRequestBody(report: BumpReport): string {
  const rejected = [...report.minor.rejected, ...report.major.rejected];
  const hasMajors = report.major.adopted.length > 0;

  return [
    'Dependency bump from `deno task bump`. Every candidate was installed and verified with `deno task ci`. Candidates that broke were bisected out and stay on their current pin; file each proposed adoption as a trakt/og issue.',
    '',
    hasMajors
      ? 'This run includes major bumps. Keep the PR as a draft until a human has reviewed them, then ship with `deno task client:land <pr>`.'
      : 'Minor and patch bumps only. Ship with `deno task client:land <pr>` after review.',
    '',
    ...section('Minor and patch', report.minor.adopted.map(upgradeLine)),
    ...section('Major', report.major.adopted.map(upgradeLine)),
    ...section('Reverted', rejected.map(upgradeLine)),
    ...section(
      'Held',
      report.held.map(({ key, current, held, reason }) =>
        `- \`${key}\` stays on ${current} (${held} is out): ${reason}`
      ),
    ),
    ...section(
      'Install scripts',
      report.allowScripts.map(({ name, from, to }) =>
        `- \`allowScripts\` grant for \`${name}\` moved from ${from} to ${to} (same package, new version)`
      ),
    ),
    'No issue: dependency maintenance.',
  ].join('\n').trimEnd() + '\n';
}
