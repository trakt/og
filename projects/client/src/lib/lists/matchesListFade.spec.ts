import { describe, expect, it } from 'vitest';
import { quickIconFill } from '../components/media/quickIconFill.ts';
import { matchesListFade } from './matchesListFade.ts';
const match = (option: string, notes?: string) =>
  matchesListFade({ option, notes, state: {}, fill: quickIconFill({ state: {} }) });
describe('matchesListFade', () => {
  it('should fade notes without needing an overlay, treating blank notes as absent', () => {
    expect(match('notes', 'A favorite.')).toBe(true);
    expect(match('nonotes', ' ')).toBe(true);
    expect(match('nonotes', 'A favorite.')).toBe(false);
  });
  it('should not fade unknown overlay state or a hide-only choice', () => {
    expect(match('unwatched')).toBe(false);
    expect(match('released')).toBe(false);
    const state = { watched: true, plays: 1 };
    expect(matchesListFade({ option: 'watched', state, fill: quickIconFill({ state }) })).toBe(true);
  });
});
