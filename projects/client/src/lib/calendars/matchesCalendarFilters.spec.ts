import { describe, expect, it } from 'vitest';
import { emptyFilters } from '../components/filters/advancedFilters.ts';
import { toCalendarItems } from './toCalendarItems.ts';
import { matchesCalendarFilters } from './matchesCalendarFilters.ts';

const items = toCalendarItems([
  {
    first_aired: '2026-09-30T21:00:00Z',
    show: { title: 'Shogun', overview: 'Warrior in Japan', ids: { trakt: 1, slug: 'shogun' } },
    episode: {
      title: 'The Line of Beauty',
      overview: 'An unexpected arrival',
      season: 1,
      number: 1,
      episode_type: 'series_premiere',
      ids: { trakt: 2 },
    },
  },
  {
    released: '2026-09-30',
    movie: { title: 'Arrival', overview: 'Visitors from space', ids: { trakt: 3, slug: 'arrival' } },
  },
]);
const match = (query: string) => items.filter((item) => matchesCalendarFilters(item, { ...emptyFilters, query }));

describe('matchesCalendarFilters', () => {
  it('should match every term against titles and descriptions, ignoring case', () => {
    expect(match('SHOGUN beauty')).toEqual(items.slice(0, 1));
    expect(match('japan unexpected')).toEqual(items.slice(0, 1));
    expect(match('arrival space')).toEqual(items.slice(1));
    expect(match('shogun space')).toEqual([]);
    expect(match('')).toEqual(items);
  });
  it('should include or exclude episode types without filtering movies in a mixed calendar', () => {
    const include = { ...emptyFilters, episode_types: { values: ['series_premiere'], mode: 'any' as const } };
    expect(items.filter((item) => matchesCalendarFilters(item, include))).toEqual(items);
    const exclude = { ...include, episode_types: { ...include.episode_types, mode: 'none' as const } };
    expect(items.filter((item) => matchesCalendarFilters(item, exclude))).toEqual(items.slice(1));
    expect(items.filter((item) => matchesCalendarFilters(item, { ...include, query: 'beauty' }))).toEqual(
      items.slice(0, 1),
    );
  });
});
