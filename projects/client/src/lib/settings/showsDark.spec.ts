import { describe, expect, it } from 'vitest';
import { showsDark } from './showsDark.ts';

describe('showsDark', () => {
  it('should follow On and Off whatever the system appearance', () => {
    expect(showsDark({ darkKnight: 'true', prefersDark: false })).toBe(true);
    expect(showsDark({ darkKnight: 'false', prefersDark: true })).toBe(false);
  });

  it('should follow the system appearance on Auto', () => {
    expect(showsDark({ darkKnight: 'auto', prefersDark: true })).toBe(true);
    expect(showsDark({ darkKnight: 'auto', prefersDark: false })).toBe(false);
  });
});
