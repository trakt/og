import { describe, expect, it } from 'vitest';
import { emptyFilters } from './advancedFilters.ts';
import { filterTags, filterValueLabel } from './filterTags.ts';

describe('util: filterValueLabel', () => {
  it('should name values the way OG did', () => {
    expect(filterValueLabel('genres', 'science-fiction')).toBe('Science Fiction');
    expect(filterValueLabel('certifications', 'tv-ma')).toBe('TV-MA');
    expect(filterValueLabel('status', 'returning series')).toBe('Returning Series');
    expect(filterValueLabel('languages', 'ja')).toBe('Japanese');
    expect(filterValueLabel('countries', 'us')).toBe('United States');
    expect(filterValueLabel('networks', 'A&E')).toBe('A&E');
  });

  it('should fall back to the code for one it can not name', () => {
    expect(filterValueLabel('languages', 'xx')).toBe('XX');
  });
});

describe('util: filterTags', () => {
  it("should list the tags in OG's order, excluded ones marked", () => {
    const tags = filterTags({
      ...emptyFilters,
      genres: { values: ['drama'], mode: 'none' },
      countries: { values: ['jp'], mode: 'any' },
      years: [2000, 2010],
      runtimes: [30, 60],
      ratings: [70, 100],
      imdb_ratings: [7, 10],
      rt_user_meters: [60, 100],
    });
    expect(tags).toEqual([
      { id: 'genres-drama', text: 'Drama', without: true },
      { id: 'countries-jp', text: 'Japan', without: false },
      { id: 'years', text: '2000 - 2010', without: false },
      { id: 'runtimes', text: '30 - 60 mins', without: false },
      { id: 'ratings', text: '70 - 100%', without: false, site: 'trakt' },
      { id: 'imdb_ratings', text: '7.0 - 10.0', without: false, site: 'imdb' },
      { id: 'rt_user_meters', text: '60 - 100%', without: false, site: 'rt-audience' },
    ]);
  });
});
