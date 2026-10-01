import { describe, expect, it } from 'vitest';
import { returnPath } from './returnPath.ts';

describe('returnPath', () => {
  it('should keep a local path and its query', () => {
    expect(returnPath('/shows/the-boys-2019?tab=seasons')).toBe('/shows/the-boys-2019?tab=seasons');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'shows', null, undefined, 42])(
    'should fall back to / for %s',
    (value) => {
      expect(returnPath(value)).toBe('/');
    },
  );
});
