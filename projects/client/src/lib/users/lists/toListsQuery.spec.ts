import { describe, expect, it } from 'vitest';
import { toListsQuery } from './toListsQuery.ts';
import { toListsSearch } from './toListsSearch.ts';

const read = (search: string, mode: 'personal' | 'collaborations' = 'personal') =>
  toListsQuery(new URLSearchParams(search), mode);

describe('toListsQuery', () => {
  it('should default to Rank on personal lists and Updated Date on collaborations', () => {
    expect(read('')).toEqual({ sort: 'rank', reversed: false, terms: '' });
    expect(read('', 'collaborations')).toEqual({ sort: 'updated', reversed: false, terms: '' });
  });

  it('should read OG sort and terms, where desc means the arrow is flipped', () => {
    expect(read('sort=title,desc&terms=horror')).toEqual({ sort: 'title', reversed: true, terms: 'horror' });
    expect(read('sort=likes,asc')).toEqual({ sort: 'likes', reversed: false, terms: '' });
  });

  it('should fall back on a sort the mode does not have', () => {
    expect(read('sort=rank,asc', 'collaborations').sort).toBe('updated');
    expect(read('sort=liked,desc').sort).toBe('rank');
  });
});

describe('toListsSearch', () => {
  it('should leave the defaults out and round-trip the rest', () => {
    expect(toListsSearch({ sort: 'rank', reversed: false, terms: ' ' }, 'personal')).toBe('');
    expect(toListsSearch({ sort: 'updated', reversed: false, terms: '' }, 'collaborations')).toBe('');
    const search = toListsSearch({ sort: 'title', reversed: true, terms: 'best of' }, 'personal');
    expect(search).toBe('?sort=title,desc&terms=best+of');
    expect(read(search.slice(1))).toEqual({ sort: 'title', reversed: true, terms: 'best of' });
  });
});
