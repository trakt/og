import { describe, expect, it } from 'vitest';
import { toCreditsQuery } from './toCreditsQuery.ts';
import { toCreditsSearch } from './toCreditsSearch.ts';

const parse = (search: string) => toCreditsQuery(new URLSearchParams(search));

describe('toCreditsQuery', () => {
  it('should default to released, both types and no terms', () => {
    expect(parse('')).toEqual({
      fade: [],
      hide: [],
      sort: 'released',
      reversed: false,
      terms: '',
      movies: true,
      shows: true,
    });
  });

  it("should read OG's desc as the flipped arrow", () => {
    expect(parse('?sort=title,desc')).toMatchObject({ sort: 'title', reversed: true });
    expect(parse('?sort=title,asc')).toMatchObject({ sort: 'title', reversed: false });
  });

  it('should ignore an unknown sort', () => {
    expect(parse('?sort=rank,asc').sort).toBe('released');
  });

  it('should read the displayed types and the terms', () => {
    expect(parse('?display=movie&terms=walter')).toMatchObject({ movies: true, shows: false, terms: 'walter' });
  });
});

describe('toCreditsSearch', () => {
  it('should leave the defaults out', () => {
    expect(toCreditsSearch(parse(''))).toBe('');
  });

  it('should round-trip a filtered view', () => {
    const search = '?sort=votes,desc&display=show&terms=walter+white';

    expect(toCreditsSearch(parse(search))).toBe(search);
  });

  it('should round-trip fade and hide, including person-specific filters', () => {
    const search = '?fade=watching,rated&hide=unreleased,self';
    expect(toCreditsSearch(parse(search))).toBe(search);
    expect(parse('?fade=bogus&hide=bogus,unrated').hide).toEqual(['unrated']);
  });

  it('should keep an empty display when both types are off', () => {
    const query = { ...parse(''), movies: false, shows: false };

    expect(parse(toCreditsSearch(query))).toEqual(query);
  });
});
