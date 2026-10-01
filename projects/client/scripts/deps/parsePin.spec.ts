import { describe, expect, it } from 'vitest';
import { parsePin } from './parsePin.ts';

describe('util: parsePin', () => {
  it('should read a plain exact pin', () => {
    expect(parsePin('svelte', '5.57.1')).toEqual({
      key: 'svelte',
      registryName: 'svelte',
      version: '5.57.1',
      prefix: '',
    });
  });

  it('should read an npm alias to a jsr package', () => {
    expect(parsePin('@trakt/api', 'npm:@jsr/trakt__api@0.6.0')).toEqual({
      key: '@trakt/api',
      registryName: '@jsr/trakt__api',
      version: '0.6.0',
      prefix: 'npm:@jsr/trakt__api@',
    });
  });

  it('should read an unscoped npm alias', () => {
    expect(parsePin('ts', 'npm:typescript@6.0.3')).toMatchObject({
      registryName: 'typescript',
      prefix: 'npm:typescript@',
    });
  });

  it('should leave ranges, tags, pre-releases and non-registry specs alone', () => {
    expect(parsePin('a', '^1.2.3')).toBeUndefined();
    expect(parsePin('b', '~1.2.3')).toBeUndefined();
    expect(parsePin('c', 'latest')).toBeUndefined();
    expect(parsePin('d', '7.0.0-rc.1')).toBeUndefined();
    expect(parsePin('e', 'github:owner/repo')).toBeUndefined();
    expect(parsePin('f', 'file:../local')).toBeUndefined();
    expect(parsePin('g', 'npm:@jsr/trakt__api@^0.6.0')).toBeUndefined();
  });
});
