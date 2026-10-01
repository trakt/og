import { describe, expect, it } from 'vitest';
import type { Packument } from './Packument.ts';
import { pickTargets } from './pickTargets.ts';

const NOW = new Date('2026-09-29T12:00:00Z');
const DAY = 1440;

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

// Builds a packument from `version: hours since publish`. The newest listed stable version is `latest`
// unless one is given.
const packument = (
  releases: Readonly<Record<string, number>>,
  { latest, deprecated = [] }: { latest?: string; deprecated?: ReadonlyArray<string> } = {},
): Packument => ({
  'dist-tags': { latest: latest ?? Object.keys(releases).at(-1) ?? '' },
  time: Object.fromEntries(Object.entries(releases).map(([version, hours]) => [version, hoursAgo(hours)])),
  versions: Object.fromEntries(
    Object.keys(releases).map((version) => [
      version,
      deprecated.includes(version) ? { deprecated: 'do not use' } : {},
    ]),
  ),
});

const pick = (current: string, doc: Packument, extra: Partial<Parameters<typeof pickTargets>[0]> = {}) =>
  pickTargets({ current, packument: doc, now: NOW, minimumAgeMinutes: DAY, ...extra });

describe('util: pickTargets', () => {
  it('should pick the newest release on the current major as the minor target', () => {
    expect(pick('1.0.0', packument({ '1.0.0': 900, '1.0.1': 500, '1.2.0': 300, '1.10.0': 100 }))).toEqual({
      minor: '1.10.0',
    });
  });

  it('should split a later major into its own target', () => {
    expect(pick('2.15.0', packument({ '2.15.0': 900, '2.16.0': 200, '3.0.0': 100, '3.1.0': 50 }))).toEqual({
      minor: '2.16.0',
      major: '3.1.0',
    });
  });

  it('should return nothing when already on the newest release', () => {
    expect(pick('4.0.0', packument({ '3.9.0': 900, '4.0.0': 500 }))).toEqual({});
  });

  it('should never offer an older version', () => {
    expect(pick('4.0.0', packument({ '3.9.0': 900, '4.0.0': 500 }, { latest: '3.9.0' }))).toEqual({});
  });

  describe('for the minimum age', () => {
    it('should skip releases younger than the minimum age and take the newest one old enough', () => {
      expect(pick('4.143.0', packument({ '4.143.0': 100, '4.143.1': 30, '4.144.0': 5 }))).toEqual({
        minor: '4.143.1',
      });
    });

    it('should offer nothing when every newer release is too young', () => {
      expect(pick('0.6.0', packument({ '0.6.0': 100, '0.6.1': 23 }))).toEqual({});
    });

    it('should count a release exactly at the minimum age as old enough', () => {
      expect(pick('1.0.0', packument({ '1.0.0': 100, '1.0.1': 24 }))).toEqual({ minor: '1.0.1' });
    });

    it('should offer everything when the minimum age is 0', () => {
      expect(pick('1.0.0', packument({ '1.0.0': 100, '1.0.1': 0 }), { minimumAgeMinutes: 0 })).toEqual({
        minor: '1.0.1',
      });
    });

    it('should skip a version with no publish time', () => {
      const doc: Packument = { 'dist-tags': { latest: '1.0.1' }, time: {}, versions: { '1.0.0': {}, '1.0.1': {} } };
      expect(pick('1.0.0', doc)).toEqual({});
    });
  });

  describe('for release channels', () => {
    it('should skip pre-releases', () => {
      expect(pick('6.0.3', packument({ '6.0.3': 900, '6.1.0-beta': 200, '6.1.0-rc.1': 100 }, { latest: '6.0.3' })))
        .toEqual({});
    });

    it('should skip deprecated releases', () => {
      expect(pick('1.0.0', packument({ '1.0.0': 900, '1.1.0': 500, '1.2.0': 300 }, { deprecated: ['1.2.0'] })))
        .toEqual({ minor: '1.1.0' });
    });

    it('should never go past the latest dist-tag', () => {
      expect(pick('1.0.0', packument({ '1.0.0': 900, '1.1.0': 500, '2.0.0': 300 }, { latest: '1.1.0' }))).toEqual({
        minor: '1.1.0',
      });
    });

    it('should still pick releases when latest is not a stable version', () => {
      expect(pick('1.0.0', packument({ '1.0.0': 900, '1.1.0': 500 }, { latest: '2.0.0-rc.1' }))).toEqual({
        minor: '1.1.0',
      });
    });
  });

  describe('for holds', () => {
    const hold = { below: '7.0.0', reason: 'svelte-check needs 6' };

    it('should keep typescript on 6 and report the release it held back', () => {
      expect(pick('6.0.3', packument({ '6.0.3': 900, '6.0.4': 200, '7.0.0': 150, '7.0.2': 100 }), { hold })).toEqual({
        minor: '6.0.4',
        held: '7.0.2',
      });
    });

    it('should report the held release even with no allowed bump', () => {
      expect(pick('6.0.3', packument({ '6.0.3': 900, '7.0.2': 100 }), { hold })).toEqual({ held: '7.0.2' });
    });

    it('should not report a hold for releases too young to install anyway', () => {
      expect(pick('6.0.3', packument({ '6.0.3': 900, '7.0.2': 1 }), { hold })).toEqual({});
    });

    it('should ignore a hold the pin is already past', () => {
      expect(pick('7.0.0', packument({ '7.0.0': 900, '7.0.2': 100 }), { hold })).toEqual({ minor: '7.0.2' });
    });
  });

  it('should return nothing when the current version is not a stable pin', () => {
    expect(pick('7.0.0-rc.1', packument({ '7.0.0': 100 }))).toEqual({});
  });
});
