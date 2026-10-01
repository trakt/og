import { describe, expect, it } from 'vitest';
import type { BumpReport } from './BumpReport.ts';
import { bumpTitle } from './bumpTitle.ts';
import { pullRequestBody } from './pullRequestBody.ts';
import { rejectedIssues } from './rejectedIssues.ts';
import type { Upgrade } from './Upgrade.ts';

const upgrade = (key: string, version: string, to: string): Upgrade => ({
  pin: { key, registryName: key, version, prefix: '' },
  to,
});

const MINOR_ONLY: BumpReport = {
  minor: { adopted: [upgrade('eslint', '10.8.1', '10.11.0')], rejected: [] },
  major: { adopted: [], rejected: [upgrade('msw', '2.15.0', '3.0.0')] },
  held: [{ key: 'typescript', current: '6.0.3', held: '7.0.2', reason: 'svelte-check needs 6' }],
  allowScripts: [{ name: 'workerd', from: '1.20260926.1', to: '1.20261001.0' }],
  logs: { 'msw@3.0.0': 'error: msw 3 broke it' },
};

const WITH_MAJOR: BumpReport = {
  ...MINOR_ONLY,
  major: { adopted: [upgrade('globals', '17.12.0', '18.0.0')], rejected: [] },
};

describe('util: bumpTitle', () => {
  it('should name majors only when the run adopted one', () => {
    expect(bumpTitle(MINOR_ONLY)).toBe('chore(deps): bump minor and patch versions');
    expect(bumpTitle(WITH_MAJOR)).toBe('chore(deps): bump minor, patch and major versions');
  });
});

describe('util: pullRequestBody', () => {
  it('should list adopted, reverted, held and allowScripts changes', () => {
    const body = pullRequestBody(MINOR_ONLY);

    expect(body).toContain('# Minor and patch\n\n- `eslint` 10.8.1 → 10.11.0');
    expect(body).toContain('# Reverted\n\n- `msw` 2.15.0 → 3.0.0');
    expect(body).toContain('- `typescript` stays on 6.0.3 (7.0.2 is out): svelte-check needs 6');
    expect(body).toContain('`workerd` moved from 1.20260926.1 to 1.20261001.0');
    expect(body).not.toContain('# Major');
    expect(body).toContain('deno task client:land <pr>');
    expect(body).toContain('No issue: dependency maintenance.');
  });

  it('should say a run with majors waits for a human', () => {
    const body = pullRequestBody(WITH_MAJOR);
    expect(body).toContain('# Major\n\n- `globals` 17.12.0 → 18.0.0');
    expect(body).toContain('Keep the PR as a draft until a human has reviewed them');
  });

  it('should never use em or en dashes', () => {
    expect(pullRequestBody(WITH_MAJOR)).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('util: rejectedIssues', () => {
  it('should open one adopt issue per rejected bump with the failing log', () => {
    const [issue, ...rest] = rejectedIssues(MINOR_ONLY);

    expect(rest).toEqual([]);
    expect(issue?.title).toBe('chore(deps): adopt msw 3.0.0');
    expect(issue?.titlePrefix).toBe('chore(deps): adopt msw ');
    expect(issue?.body).toContain('error: msw 3 broke it');
    expect(issue?.body).toContain('from 2.15.0 to 3.0.0');
  });

  it('should file one issue for the major when a package failed both passes', () => {
    const issues = rejectedIssues({
      ...MINOR_ONLY,
      minor: { adopted: [], rejected: [upgrade('msw', '2.15.0', '2.16.0')] },
    });

    expect(issues.map(({ title }) => title)).toEqual(['chore(deps): adopt msw 3.0.0']);
  });
});
