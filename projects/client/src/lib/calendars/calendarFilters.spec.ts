import { describe, expect, it } from 'vitest';
import { calendarFilters } from './calendarFilters.ts';
import { emptyFilters } from '../components/filters/advancedFilters.ts';
import { fromFilterDraft, toFilterDraft } from '../components/filters/filterDraft.ts';
const now = new Date('2026-09-30T12:00:00Z');

describe('calendarFilters', () => {
  it('should offer episode types and networks on every show calendar without RT ratings', () => {
    for (const slug of ['shows', 'premieres', 'new-shows', 'finales']) {
      const config = calendarFilters({ slug, now });
      expect(config.lists).toContain('episode_types');
      expect(config.lists).toContain('networks');
      expect(config.ranges).toEqual(['runtimes', 'ratings', 'imdb_ratings']);
      expect(config.query).toBe(true);
    }
  });
  it('should offer movie ratings without show filters on all movie calendars', () => {
    for (const slug of ['movies', 'streaming', 'dvd']) {
      const config = calendarFilters({ slug, now });
      expect(config.type).toBe('movies');
      expect(config.lists).not.toContain('episode_types');
      expect(config.lists).not.toContain('networks');
      expect(config.ranges).toContain('rt_user_meters');
    }
  });
  it('should combine both types and preserve local controls when applying the mixed calendar', () => {
    const config = calendarFilters({ slug: 'shows-movies', now });
    expect(config.optionTypes).toEqual(['shows', 'movies']);
    expect(config.ranges).toContain('rt_meters');
    const filters = {
      ...emptyFilters,
      query: 'test',
      episode_types: { values: ['series_premiere'], mode: 'none' as const },
    };
    expect(fromFilterDraft(toFilterDraft(filters, config), config)).toEqual(filters);
  });
});
