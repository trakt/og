import { describe, expect, it } from 'vitest';
import { toTheme } from './toTheme.ts';

describe('toTheme', () => {
  it('should render Off light, On dark and Auto with the system appearance', () => {
    expect(toTheme('false')).toBe('light');
    expect(toTheme('true')).toBe('dark');
    expect(toTheme('auto')).toBe('system');
  });
});
