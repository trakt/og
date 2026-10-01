import { describe, expect, it } from 'vitest';
import { listFilterOptions } from './listFilterOptions.ts';
const read = (kind = 'personal', types: string[] = [], isSelf = false) => listFilterOptions({ kind, types, isSelf });
const ids = (options: readonly { id: string }[]) => options.map(({ id }) => id);
describe('listFilterOptions', () => {
  it('should include partial progress and notes on mixed lists, with release state only under Hide', () => {
    expect(ids(read().fade)).toContain('watching');
    expect(ids(read().fade).slice(-2)).toEqual(['notes', 'nonotes']);
    expect(ids(read().fade)).not.toContain('released');
    expect(ids(read().hide).slice(-7)).toEqual([
      'released',
      'unreleased',
      'noreleasedate',
      'ended',
      'airing',
      'notes',
      'nonotes',
    ]);
  });
  it('should omit partial progress for official lists, movies, episodes and people', () => {
    for (const menu of [read('official'), read('personal', ['movie']), read('personal', ['episode', 'person'])]) {
      expect(ids(menu.fade)).not.toContain('watching');
      expect(ids(menu.hide)).not.toContain('collecting');
    }
    expect(ids(read('personal', ['movie', 'season']).fade)).toContain('collecting');
  });
  it('should omit membership choices only on the owner’s corresponding list', () => {
    expect(ids(read('personal', [], true).hide)).not.toContain('listed');
    expect(ids(read('watchlist', [], true).hide)).not.toContain('watchlisted');
    expect(ids(read('favorites', [], true).hide)).toContain('listed');
    expect(ids(read('personal').hide)).toContain('listed');
  });
});
