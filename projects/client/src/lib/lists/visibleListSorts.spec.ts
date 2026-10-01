import { describe, expect, it } from 'vitest';
import { visibleListSorts } from './visibleListSorts.ts';

const bys = (...args: Parameters<typeof visibleListSorts>) => visibleListSorts(...args).map(({ by }) => by);

describe('visibleListSorts', () => {
  it('should hide VIP sorts and your data from a signed-out viewer', () => {
    expect(bys({ types: [], vip: false, signedIn: false })).toEqual([
      'rank',
      'added',
      'title',
      'released',
      'runtime',
      'popularity',
      'random',
      'percentage',
      'votes',
    ]);
  });

  it('should show every sort to a signed-in VIP on all types', () => {
    expect(bys({ types: [], vip: true, signedIn: true })).toHaveLength(19);
  });

  it('should hide sorts that do not apply to the chosen types', () => {
    const shows = bys({ types: ['show'], vip: true, signedIn: true });
    expect(shows).toContain('rt_tomatometer');
    expect(shows).not.toContain('metascore');
    expect(bys({ types: ['season'], vip: true, signedIn: true })).not.toContain('imdb_rating');
  });
});
