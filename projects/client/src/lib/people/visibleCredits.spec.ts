import { describe, expect, it } from 'vitest';
import type { CreditsQuery } from './CreditsQuery.ts';
import type { PersonCredit } from './PersonCredit.ts';
import { visibleCredits } from './visibleCredits.ts';

const credit = (
  title: string,
  type: PersonCredit['type'],
  sortBy: Partial<PersonCredit['sortBy']>,
  characters = '',
): PersonCredit => ({
  type,
  id: title.length,
  href: `/${type}s/${title}`,
  title,
  released: true,
  episodeCount: 0,
  characters,
  sortBy: {
    released: '2000-01-01',
    title: title.toLowerCase(),
    percentage: 0,
    votes: 0,
    runtime: 0,
    episodes: 0,
    ...sortBy,
  },
});

const credits = [
  credit('Drive', 'movie', { released: '2011-09-16', votes: 5 }, 'Shannon'),
  credit('Breaking Bad', 'show', { released: '2008-01-20', votes: 9 }, 'Walter White'),
  credit('Argo', 'movie', { released: '2012-10-12', votes: 1 }, "Jack O'Donnell"),
];

const query: CreditsQuery = {
  fade: [],
  hide: [],
  sort: 'released',
  reversed: false,
  terms: '',
  movies: true,
  shows: true,
};
const titles = (list: readonly PersonCredit[]) => list.map(({ title }) => title);

describe('visibleCredits', () => {
  it('should sort released newest first, and oldest first when reversed', () => {
    expect(titles(visibleCredits(credits, query))).toEqual(['Argo', 'Drive', 'Breaking Bad']);
    expect(titles(visibleCredits(credits, { ...query, reversed: true }))).toEqual(['Breaking Bad', 'Drive', 'Argo']);
  });

  it('should sort titles A to Z', () => {
    expect(titles(visibleCredits(credits, { ...query, sort: 'title' }))).toEqual(['Argo', 'Breaking Bad', 'Drive']);
  });

  it('should sort popularity by votes', () => {
    expect(titles(visibleCredits(credits, { ...query, sort: 'popularity' }))).toEqual([
      'Breaking Bad',
      'Drive',
      'Argo',
    ]);
  });

  it('should match terms against the title or a character', () => {
    expect(titles(visibleCredits(credits, { ...query, terms: 'WALTER' }))).toEqual(['Breaking Bad']);
    expect(titles(visibleCredits(credits, { ...query, terms: 'dri' }))).toEqual(['Drive']);
    expect(titles(visibleCredits(credits, { ...query, terms: "o'd(" }))).toEqual([]);
  });

  it('should drop the types turned off', () => {
    expect(titles(visibleCredits(credits, { ...query, movies: false }))).toEqual(['Breaking Bad']);
    expect(visibleCredits(credits, { ...query, movies: false, shows: false })).toEqual([]);
  });
});
