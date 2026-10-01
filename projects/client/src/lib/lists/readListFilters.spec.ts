import { describe, expect, it } from 'vitest';
import { readListFilters } from './readListFilters.ts';
describe('readListFilters', () => {
  it('should read separate browser preferences per list kind and drop unknown or duplicate options', () => {
    const cookies = {
      get: (key: string) => key === 'filter-hide-watchlist' ? 'notes,nonotes,notes,bogus' : 'watched,released',
    };
    expect(readListFilters({ search: new URLSearchParams(), cookies, scope: 'watchlist' }))
      .toEqual({ fade: ['watched'], hide: ['notes', 'nonotes'] });
  });
  it('should drop saved choices unavailable on the owner’s or movie-only list', () => {
    const cookies = { get: () => 'listed,watching,notes' };
    expect(readListFilters({ search: new URLSearchParams(), cookies, scope: 'list', types: ['movie'], isSelf: true }))
      .toEqual({ fade: ['notes'], hide: ['notes'] });
  });

  it('should honor an explicit empty URL over the saved hide choices', () => {
    expect(
      readListFilters({
        search: new URLSearchParams('fade=nonotes&hide='),
        cookies: { get: () => 'watched' },
        scope: 'list',
      }),
    )
      .toEqual({ fade: ['nonotes'], hide: [] });
  });
});
