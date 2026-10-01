import { describe, expect, it } from 'vitest';
import { ratingRowsSchema } from './ratingRowsSchema.ts';
import { ratingQuery } from './ratingQuery.ts';
import { sortRatings } from './sortRatings.ts';
const rows = ratingRowsSchema.parse([
  {
    type: 'movie',
    rating: 8,
    rated_at: '2026-09-29T00:00:00Z',
    movie: {
      title: 'The Zoo',
      ids: { trakt: 1, slug: 'zoo' },
      runtime: 50,
      rating: 9,
      votes: 10,
      released: '2000-01-01',
    },
  },
  {
    type: 'movie',
    rating: 10,
    rated_at: '2026-09-28T00:00:00Z',
    movie: {
      title: 'A Bear',
      ids: { trakt: 2, slug: 'bear' },
      runtime: 100,
      rating: 7,
      votes: 20,
      released: '2020-01-01',
    },
  },
  {
    type: 'movie',
    rating: 10,
    rated_at: '2026-09-27T00:00:00Z',
    movie: {
      title: 'An Apple',
      ids: { trakt: 3, slug: 'apple' },
      runtime: 60,
      rating: 8,
      votes: 30,
      released: '2010-01-01',
    },
  },
]);
const ids = (by: string, how = 'asc') =>
  sortRatings(rows, ratingQuery(`movies/all/${by}/${how}`)).map((r) => r.type === 'movie' ? r.movie?.ids.trakt : 0);
describe('sortRatings', () => {
  it('should sort titles without articles, newest date ties, and rating highest first', () => {
    expect(ids('title')).toEqual([3, 2, 1]);
    expect(ids('title', 'desc')).toEqual([1, 2, 3]);
    expect(ids('rating')).toEqual([2, 3, 1]);
    expect(ids('added', 'desc')).toEqual([3, 2, 1]);
    expect(rows.at(0)?.rating).toBe(8);
  });
  it('should order release, runtime, percentage and votes by their natural direction', () => {
    expect(ids('released')).toEqual([2, 3, 1]);
    expect(ids('runtime')).toEqual([2, 3, 1]);
    expect(ids('percentage')).toEqual([1, 3, 2]);
    expect(ids('votes')).toEqual([3, 2, 1]);
  });
});
