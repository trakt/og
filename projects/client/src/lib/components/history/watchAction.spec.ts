import { describe, expect, it } from 'vitest';
import { watchAction } from './watchAction.ts';

describe('watchAction', () => {
  it.each(['now', 'released', 'unknown'] as const)('should immediately add an unwatched item at %s', (defaultAt) => {
    expect(watchAction({ fill: 0, force: false, defaultAt })).toBe(defaultAt);
  });
  it.each([undefined, null, 'ask', 'invalid'])('should ask for a date without a valid default (%s)', (defaultAt) => {
    expect(watchAction({ fill: 0, force: false, defaultAt })).toBe('date');
  });
  it('should preserve removal and remaining choices even with a default', () => {
    expect(watchAction({ fill: 0.5, force: false, defaultAt: 'now' })).toBe('partial');
    expect(watchAction({ fill: 1, force: false, defaultAt: 'now' })).toBe('remove');
  });
  it.each([0, 0.5, 1])('should always ask when adding an additional play (%s)', (fill) => {
    expect(watchAction({ fill, force: true, defaultAt: 'now' })).toBe('date');
  });
});
