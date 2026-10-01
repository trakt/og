import { describe, expect, it } from 'vitest';
import { advancedFiltersSearch, emptyFilters, hasAdvancedFilters, parseAdvancedFilters } from './advancedFilters.ts';

const parse = (query: string) => parseAdvancedFilters(new URL(`https://og.test/shows/trending?${query}`).searchParams);

describe('util: parseAdvancedFilters', () => {
  it('should read nothing from a bare chart URL', () => {
    expect(parse('')).toEqual(emptyFilters);
    expect(hasAdvancedFilters(parse('page=2&limit=10'))).toBe(false);
  });

  it("should read OG's list prefixes as the match mode", () => {
    expect(parse('genres=drama,comedy').genres).toEqual({ values: ['drama', 'comedy'], mode: 'any' });
    expect(parse('genres=+drama,+comedy').genres).toEqual({ values: ['drama', 'comedy'], mode: 'all' });
    expect(parse('genres=%2Bdrama').genres).toEqual({ values: ['drama'], mode: 'all' });
    expect(parse('status=-ended,-canceled').status).toEqual({ values: ['ended', 'canceled'], mode: 'none' });
  });

  it('should keep names with spaces, ampersands and pluses', () => {
    expect(parse('status=returning%20series').status.values).toEqual(['returning series']);
    expect(parse('networks=A%26E,Disney%2B').networks.values).toEqual(['A&E', 'Disney+']);
  });

  it('should round-trip calendar terms and excluded episode types', () => {
    const query = 'query=Shogun%20%26%20Beauty&episode_types=-season_finale,-series_finale';
    expect(advancedFiltersSearch(parse(query))).toBe(query);
    expect(parse('query=%20*%20').query).toBe('');
    expect(parse(query).episode_types).toEqual({ values: ['season_finale', 'series_finale'], mode: 'none' });
  });

  it('should read ranges and drop malformed ones', () => {
    const filters = parse('years=2010-2000&imdb_ratings=7.5-10.0&runtimes=abc&ratings=70');
    expect(filters.years).toEqual([2000, 2010]);
    expect(filters.imdb_ratings).toEqual([7.5, 10]);
    expect(filters.runtimes).toBeNull();
    expect(filters.ratings).toBeNull();
  });

  it('should lower-case watch now and drop repeats', () => {
    expect(parse('watchnow=Netflix,free,netflix').watchnow).toEqual(['netflix', 'free']);
  });
});

describe('util: advancedFiltersSearch', () => {
  it("should write OG's query in OG's order, with the prefixes and commas unescaped", () => {
    const filters = {
      ...emptyFilters,
      watchnow: ['netflix', 'free'],
      genres: { values: ['drama', 'comedy'], mode: 'all' as const },
      networks: { values: ['A&E', 'Disney+'], mode: 'none' as const },
      years: [2000, 2010] as const,
      imdb_ratings: [7, 10] as const,
    };
    expect(advancedFiltersSearch(filters)).toBe(
      'watchnow=netflix,free&genres=+drama,+comedy&networks=-A%26E,-Disney%2B&years=2000-2010&imdb_ratings=7.0-10.0',
    );
  });

  it('should round-trip through the URL', () => {
    const query = 'genres=+drama,+comedy&status=-returning%20series&years=1990-2000&rt_meters=80-100';
    expect(advancedFiltersSearch(parse(query))).toBe(query);
  });

  it('should be empty with nothing filtered', () => {
    expect(advancedFiltersSearch(emptyFilters)).toBe('');
  });
});
