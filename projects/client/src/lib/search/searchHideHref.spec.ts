import { describe, expect, it } from 'vitest';
import { searchHideHref } from './searchHideHref.ts';

describe('searchHideHref', () => {
  it('should keep the search terms and limit, reset pagination and use the API watchlist name', () => {
    expect(
      searchHideHref(new URL('https://og.test/search/shows?query=breaking&page=3&limit=12'), ['watchlisted', 'rated']),
    )
      .toBe('/search/shows?query=breaking&limit=12&hide=watchlist%2Crated');
  });

  it('should clear a previous Hide selection explicitly', () => {
    expect(searchHideHref(new URL('https://og.test/search/movies?q=the&hide=watched&page=2'), []))
      .toBe('/search/movies?q=the&hide=');
  });
});
