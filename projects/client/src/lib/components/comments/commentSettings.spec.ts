import { describe, expect, it } from 'vitest';
import { commentSettings } from './commentSettings.ts';

describe('util: commentSettings', () => {
  it('should read the spoiler setting and the blocked members', () => {
    const settings = commentSettings({
      browsing: { spoilers: { comments: 'hide' }, comments: { blocked_uids: [3, 7] } },
    });
    expect(settings.hideSpoilers).toBe(true);
    expect([...settings.blocked]).toEqual([3, 7]);
  });

  it('should show spoilers and block nobody when logged out or the shape is off', () => {
    for (const input of [null, {}, { browsing: { spoilers: { comments: 'show' } } }, { browsing: 'x' }]) {
      const settings = commentSettings(input);
      expect(settings.hideSpoilers).toBe(false);
      expect(settings.blocked.size).toBe(0);
    }
  });
});
