import { describe, expect, it } from 'vitest';
import { applyUpgrades } from './applyUpgrades.ts';

const PACKAGE_JSON = {
  name: 'og',
  scripts: { dev: 'vite dev' },
  devDependencies: { eslint: '10.8.1', typescript: '6.0.3' },
  dependencies: { '@trakt/api': 'npm:@jsr/trakt__api@0.6.0' },
};

describe('util: applyUpgrades', () => {
  it('should write exact specs into the section that pins each package', () => {
    const next = applyUpgrades(PACKAGE_JSON, [
      { pin: { key: 'eslint', registryName: 'eslint', version: '10.8.1', prefix: '' }, to: '10.11.0' },
      {
        pin: { key: '@trakt/api', registryName: '@jsr/trakt__api', version: '0.6.0', prefix: 'npm:@jsr/trakt__api@' },
        to: '0.6.1',
      },
    ]);

    expect(next).toEqual({
      ...PACKAGE_JSON,
      devDependencies: { eslint: '10.11.0', typescript: '6.0.3' },
      dependencies: { '@trakt/api': 'npm:@jsr/trakt__api@0.6.1' },
    });
  });

  it('should keep key order so the diff stays one line per bump', () => {
    const next = applyUpgrades(PACKAGE_JSON, [
      { pin: { key: 'typescript', registryName: 'typescript', version: '6.0.3', prefix: '' }, to: '6.0.4' },
    ]);
    expect(Object.keys(next)).toEqual(Object.keys(PACKAGE_JSON));
    expect(Object.keys(next.devDependencies ?? {})).toEqual(['eslint', 'typescript']);
  });

  it('should not touch the input', () => {
    applyUpgrades(PACKAGE_JSON, [
      { pin: { key: 'eslint', registryName: 'eslint', version: '10.8.1', prefix: '' }, to: '10.11.0' },
    ]);
    expect(PACKAGE_JSON.devDependencies.eslint).toBe('10.8.1');
  });
});
