import { describe, expect, it } from 'vitest';
import { parseVersion } from './parseVersion.ts';

describe('util: parseVersion', () => {
  it('should parse a stable release', () => {
    expect(parseVersion('10.11.0')).toEqual([10, 11, 0]);
  });

  it('should reject pre-releases and build metadata', () => {
    expect(parseVersion('7.0.0-beta.1')).toBeUndefined();
    expect(parseVersion('1.0.0+build.5')).toBeUndefined();
  });

  it('should reject anything that is not x.y.z', () => {
    expect(parseVersion('^1.2.3')).toBeUndefined();
    expect(parseVersion('1.2')).toBeUndefined();
    expect(parseVersion('latest')).toBeUndefined();
  });
});
