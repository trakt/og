import { describe, expect, it } from 'vitest';
import { syncAllowScripts } from './syncAllowScripts.ts';

describe('util: syncAllowScripts', () => {
  it('should move a grant to the version the lockfile now resolves', () => {
    expect(
      syncAllowScripts({
        allowScripts: ['npm:workerd@1.20260926.1'],
        lockedPackages: ['wrangler@4.144.0_@cloudflare+workers-types@4.20260702.1', 'workerd@1.20261001.0'],
      }),
    ).toEqual({
      allowScripts: ['npm:workerd@1.20261001.0'],
      moved: [{ name: 'workerd', from: '1.20260926.1', to: '1.20261001.0' }],
    });
  });

  it('should leave a grant alone when the version did not change', () => {
    expect(
      syncAllowScripts({ allowScripts: ['npm:workerd@1.20260926.1'], lockedPackages: ['workerd@1.20260926.1'] }),
    ).toEqual({ allowScripts: ['npm:workerd@1.20260926.1'], moved: [] });
  });

  it('should read scoped names and lock keys with peer suffixes', () => {
    expect(
      syncAllowScripts({
        allowScripts: ['npm:@scope/native@2.0.0'],
        lockedPackages: ['@scope/native@2.1.0_typescript@6.0.3', '@scope/native-extra@9.9.9'],
      }).allowScripts,
    ).toEqual(['npm:@scope/native@2.1.0']);
  });

  it('should treat one version locked with two peer sets as one version', () => {
    expect(
      syncAllowScripts({
        allowScripts: ['npm:msw@2.15.0'],
        lockedPackages: ['msw@2.16.0_typescript@6.0.3', 'msw@2.16.0_typescript@6.0.3_@types+node@26.6.3'],
      }).allowScripts,
    ).toEqual(['npm:msw@2.16.0']);
  });

  it('should leave a grant alone when the lockfile has several versions or none', () => {
    const allowScripts = ['npm:esbuild@0.28.1'];
    expect(syncAllowScripts({ allowScripts, lockedPackages: ['esbuild@0.28.2', 'esbuild@0.29.0'] }).moved).toEqual([]);
    expect(syncAllowScripts({ allowScripts, lockedPackages: [] }).allowScripts).toEqual(allowScripts);
  });

  it('should never add a grant for a package that is not already listed', () => {
    expect(
      syncAllowScripts({ allowScripts: [], lockedPackages: ['workerd@1.20261001.0', 'esbuild@0.28.1'] }).allowScripts,
    ).toEqual([]);
  });

  it('should keep entries it does not understand', () => {
    expect(syncAllowScripts({ allowScripts: ['jsr:@x/y'], lockedPackages: [] }).allowScripts).toEqual(['jsr:@x/y']);
  });
});
