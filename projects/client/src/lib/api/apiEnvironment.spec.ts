import { describe, expect, it } from 'vitest';
import { apiEnvironment } from './apiEnvironment.ts';

describe('apiEnvironment', () => {
  it('should default to production apiz', () => {
    expect(apiEnvironment()).toBe('https://apiz.trakt.tv');
  });

  it('should resolve the local worker', () => {
    expect(apiEnvironment('local')).toBe('http://localhost:8787');
  });

  it('should throw on an unknown name', () => {
    expect(() => apiEnvironment('staging')).toThrow(/Unknown PUBLIC_TRAKT_API/);
  });
});
