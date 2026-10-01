import { describe, expect, it } from 'vitest';
import { chartFilters } from '../../charts/chartFilters.ts';
import { emptyFilters } from './advancedFilters.ts';
import { fromFilterDraft, toFilterDraft } from './filterDraft.ts';

const now = new Date('2026-09-29T12:00:00Z');
const trending = chartFilters({ type: 'shows', chart: 'trending', period: 'weekly', now });
const recommendations = chartFilters({ type: 'shows', chart: 'recommendations', period: 'weekly', now });

describe('util: filterDraft', () => {
  it('should start every slider at its ends when that range is off', () => {
    const draft = toFilterDraft({ ...emptyFilters, years: [2000, 2010] }, trending);
    expect(draft.ranges.years).toEqual([2000, 2010]);
    expect(draft.ranges.runtimes).toEqual([0, 500]);
    expect(draft.ranges.imdb_ratings).toEqual([0, 10]);
  });

  it('should not apply a range left at its ends', () => {
    const draft = toFilterDraft({ ...emptyFilters, ratings: [0, 100], years: [1990, 2031] }, trending);
    const applied = fromFilterDraft(draft, trending);
    expect(applied.ratings).toBeNull();
    expect(applied.years).toEqual([1990, 2031]);
  });

  it("should apply only the page's own controls", () => {
    const filters = {
      ...emptyFilters,
      query: 'title',
      episode_types: { values: ['series_premiere'], mode: 'any' as const },
      genres: { values: ['drama'], mode: 'any' as const },
      certifications: { values: ['tv-ma'], mode: 'any' as const },
      runtimes: [30, 60] as const,
    };
    const applied = fromFilterDraft(toFilterDraft(filters, recommendations), recommendations);
    expect(applied.genres.values).toEqual(['drama']);
    expect(applied.certifications.values).toEqual([]);
    expect(applied.runtimes).toBeNull();
    expect(applied.query).toBe('');
    expect(applied.episode_types.values).toEqual([]);
  });
});
