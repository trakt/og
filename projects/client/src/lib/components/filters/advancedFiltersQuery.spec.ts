import { describe, expect, it } from 'vitest';
import { emptyFilters } from './advancedFilters.ts';
import { advancedFiltersQuery } from './advancedFiltersQuery.ts';

const filters = {
  ...emptyFilters,
  watchnow: ['netflix'],
  genres: { values: ['drama', 'comedy'], mode: 'all' as const },
  certifications: { values: ['tv-ma'], mode: 'none' as const },
  status: { values: ['ended'], mode: 'any' as const },
  years: [2000, 2010] as const,
  imdb_ratings: [7.5, 10] as const,
};

describe('util: advancedFiltersQuery', () => {
  it("should spell the filters the API's way", () => {
    expect(advancedFiltersQuery(filters)).toEqual({
      watchnow: 'netflix',
      genres: 'drama,comedy',
      genres_operator: 'and',
      certifications: '-tv-ma',
      statuses: 'ended',
      years: '2000-2010',
      imdb_ratings: '7.5-10',
    });
  });

  it('should keep only the picked filters', () => {
    expect(advancedFiltersQuery(filters, { genres: true, years: true })).toEqual({
      genres: 'drama,comedy',
      genres_operator: 'and',
      years: '2000-2010',
    });
  });

  it('should send nothing for no filters', () => {
    expect(advancedFiltersQuery(emptyFilters)).toEqual({});
  });
});
