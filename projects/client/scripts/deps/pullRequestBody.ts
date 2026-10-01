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
    'Weekly dependency bump from `deps.yml`. Every candidate was installed and verified with `deno task lint`, `check`, `test` and `build`. Candidates that broke were bisected out and stay on their current pin, with a `chore(deps): adopt` issue each.',
    '',
    hasMajors
      ? 'This run includes major bumps, so it opens as a draft with `needs-human`. To ship it, check the majors, then mark it ready and remove the label.'
      : 'Minor and patch bumps only, so it auto-merges once checks pass.',
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
  ].join('\n').trimEnd() + '\n';
}
