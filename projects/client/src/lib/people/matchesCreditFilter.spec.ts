import { describe, expect, it } from 'vitest';
import { matchesCreditFilter } from './matchesCreditFilter.ts';
import type { PersonCredit } from './PersonCredit.ts';

const credit: PersonCredit = {
  id: 1,
  type: 'show',
  title: 'Show',
  href: '/shows/show',
  released: true,
  episodeCount: 10,
  characters: 'A character',
  airedEpisodes: 10,
  sortBy: { released: '2000-01-01', title: 'show', percentage: 80, votes: 2, runtime: 60, episodes: 10 },
};
describe('matchesCreditFilter', () => {
  it('should distinguish complete and partial progress and leave unknown state alone', () => {
    const state = { watched: true, watchedEpisodes: 4, collected: true, collectedEpisodes: 10 };
    expect(matchesCreditFilter({ option: 'watching', credit, state })).toBe(true);
    expect(matchesCreditFilter({ option: 'watched', credit, state })).toBe(false);
    expect(matchesCreditFilter({ option: 'collected', credit, state })).toBe(true);
    expect(matchesCreditFilter({ option: 'unwatched', credit, state: {} })).toBe(false);
  });
  it('should distinguish released, future and undated credits', () => {
    expect(matchesCreditFilter({ option: 'released', credit, state: {} })).toBe(true);
    expect(matchesCreditFilter({ option: 'unreleased', credit: { ...credit, released: false }, state: {} })).toBe(true);
    const undated = { ...credit, released: false, sortBy: { ...credit.sortBy, released: '3000-01-01' } };
    expect(matchesCreditFilter({ option: 'noreleasedate', credit: undated, state: {} })).toBe(true);
    expect(matchesCreditFilter({ option: 'unreleased', credit: undated, state: {} })).toBe(false);
  });
  it('should recognize Self and archive roles without hiding fictional characters', () => {
    expect(
      matchesCreditFilter({
        option: 'self',
        credit: { ...credit, characters: 'Himself (Archive Footage)' },
        state: {},
      }),
    ).toBe(true);
    expect(matchesCreditFilter({ option: 'self', credit, state: {} })).toBe(false);
  });
});
