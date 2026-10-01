import { describe, expect, it } from 'vitest';
import { ratingQuery } from './ratingQuery.ts';
describe('ratingQuery', () => {
  it('should default unknown types, ratings and sorts', () => {
    expect(ratingQuery('nonsense/11/title/anything')).toEqual({ type: 'all', rating: 'all', by: 'added', how: 'asc' });
    expect(ratingQuery('episodes/0/runtime')).toEqual({ type: 'episodes', rating: 'all', by: 'added', how: 'asc' });
  });
  it('should retain type, stars and available sorts with OG direction semantics', () => {
    expect(ratingQuery('movies/10/runtime/desc')).toEqual({ type: 'movies', rating: '10', by: 'runtime', how: 'desc' });
    expect(ratingQuery('seasons/1/title')).toEqual({ type: 'seasons', rating: '1', by: 'title', how: 'asc' });
  });
});
