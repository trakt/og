import { describe, expect, it } from 'vitest';
import { listHref } from './listHref.ts';

const url = new URL('https://og.trakt.tv/users/sean/lists/heist?page=3&genres=drama&hide=watched');

describe('listHref', () => {
  it('should set the sort, go back to page one and keep the other filters', () => {
    expect(listHref(url, { sort: { by: 'title', how: 'desc' } }))
      .toBe('/users/sean/lists/heist?genres=drama&hide=watched&sort=title,desc');
  });

  it('should drop display and genres for All Types and All Genres', () => {
    expect(listHref(url, { types: [], genres: [] })).toBe('/users/sean/lists/heist?hide=watched');
  });

  it('should clear Hide explicitly so the cookie cannot restore it, and preserve other filters', () => {
    expect(listHref(url, { hide: [], terms: 'Heat' })).toBe('/users/sean/lists/heist?genres=drama&hide=&terms=Heat');
    expect(listHref(new URL('https://og.trakt.tv/users/sean/lists/heist?terms=Heat&watchnow=netflix'), { terms: '' }))
      .toBe('/users/sean/lists/heist?watchnow=netflix');
  });

  it('should set a type list', () => {
    expect(listHref(new URL('https://og.trakt.tv/users/sean/lists/heist'), { types: ['movie', 'show'] }))
      .toBe('/users/sean/lists/heist?display=movie,show');
  });
});
