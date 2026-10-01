import { describe, expect, it } from 'vitest';
import { listPath } from './listPath.ts';

const list = (type: string) => ({ type, ids: { slug: 'heist' }, user: { username: 'Sean', ids: { slug: 'sean' } } });

describe('listPath', () => {
  it('should send each list type to its page', () => {
    expect(listPath(list('personal'))).toBe('/users/sean/lists/heist');
    expect(listPath(list('official'))).toBe('/lists/official/heist');
    expect(listPath(list('watchlist'))).toBe('/users/sean/watchlist');
    expect(listPath(list('favorites'))).toBe('/users/sean/favorites');
  });
});
