import { describe, expect, it } from 'vitest';
import { toListQuery } from './toListQuery.ts';

const read = (search: string) => toListQuery(new URLSearchParams(search));

describe('toListQuery', () => {
  it('should read the sort, types, genres and page', () => {
    expect(read('sort=added,desc&display=movie,show&genres=drama&page=3')).toEqual({
      sortBy: 'added',
      sortHow: 'desc',
      types: ['movie', 'show'],
      genres: ['drama'],
      page: 3,
      limit: 120,
    });
  });

  it('should leave the default sort for an unknown one but keep its direction', () => {
    expect(read('sort=bogus,desc')).toMatchObject({ sortHow: 'desc' });
    expect(read('sort=bogus,desc').sortBy).toBeUndefined();
  });

  it('should treat all as no filter and drop unknown types', () => {
    expect(read('display=all,movie,podcast&genres=all')).toMatchObject({ types: ['movie'], genres: [] });
  });

  it('should cap the limit at the worker page size', () => {
    expect(read('limit=1000').limit).toBe(250);
    expect(read('limit=-4&page=zero')).toMatchObject({ limit: 120, page: 1 });
  });
});
