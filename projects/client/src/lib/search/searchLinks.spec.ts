import { describe, expect, it } from 'vitest';
import { searchTypes } from '../components/header/searchTypes.ts';
import { searchLinks } from './searchLinks.ts';

describe('searchLinks', () => {
  it('should list the text tabs with the query and mark the current one', () => {
    const links = searchLinks(searchTypes[1], 'the office');
    expect(links.map((link) => link.label)).toEqual([
      'Shows & Movies',
      'Shows',
      'Movies',
      'Episodes',
      'People',
      'Lists',
      'Users',
    ]);
    expect(links.at(0)?.href).toBe('/search?query=the+office');
    expect(links.filter((link) => link.current).map((link) => link.href)).toEqual(['/search/shows?query=the+office']);
  });

  it('should list the ID tabs in ID mode', () => {
    expect(searchLinks(searchTypes[8], 'tt1').map((link) => [link.label, link.href])).toEqual([
      ['Trakt', '/search/trakt?query=tt1'],
      ['IMDB', '/search/imdb?query=tt1'],
      ['TMDB', '/search/tmdb?query=tt1'],
      ['TVDB', '/search/tvdb?query=tt1'],
    ]);
  });

  it('should preserve filters and the edited query while dropping the previous page', () => {
    const links = searchLinks(searchTypes[7], '2', new URLSearchParams('page=3&q=1&id_type=movie&limit=12'));
    expect(links.at(1)?.href).toBe('/search/imdb?id_type=movie&limit=12&query=2');
  });

  it('should leave the query off when there is none', () => {
    expect(searchLinks(searchTypes[0], '').at(1)?.href).toBe('/search/shows');
  });
});
