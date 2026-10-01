import { describe, expect, it } from 'vitest';
import { toDarkKnight } from './toDarkKnight.ts';

describe('toDarkKnight', () => {
  it('should read Off, On and Auto as API sends them', () => {
    expect(toDarkKnight({ browsing: { dark_knight: 'false' } })).toBe('false');
    expect(toDarkKnight({ browsing: { dark_knight: 'true' } })).toBe('true');
    expect(toDarkKnight({ browsing: { dark_knight: 'auto' } })).toBe('auto');
  });

  it('should read an unset or unknown value as Off', () => {
    expect(toDarkKnight({ browsing: { dark_knight: '' } })).toBe('false');
    expect(toDarkKnight({ browsing: { dark_knight: true } })).toBe('false');
    expect(toDarkKnight({ browsing: {} })).toBe('false');
    expect(toDarkKnight({ browsing: null })).toBe('false');
  });

  it('should be Off when signed out', () => {
    expect(toDarkKnight(null)).toBe('false');
  });
});
