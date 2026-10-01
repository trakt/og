import type { BumpReport } from './BumpReport.ts';

// The pull request title and commit message. Both have to pass commitlint (`chore` type, `deps` scope).
export function bumpTitle(report: BumpReport): string {
  return report.major.adopted.length > 0
    ? 'chore(deps): bump minor, patch and major versions'
    : 'chore(deps): bump minor and patch versions';
}
