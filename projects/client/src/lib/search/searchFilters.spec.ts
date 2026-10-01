import { describe, expect, it } from 'vitest';
import { searchFilters } from './searchFilters.ts';

const filters = (slug: string, search = '', saved: Record<string, string> = {}) =>
  searchFilters({ slug, search: new URLSearchParams(search), cookies: { get: (name) => saved[name] } });

describe('searchFilters', () => {
  it('should offer partial fade on mixed searches but no Hide section', () => {
    const result = filters('', 'hide=watched', { 'filter-fade-search': 'watching,collected' });
    expect(result.visible).toBe(true);
    expect(result.options.map(({ id }) => id)).toContain('watching');
    expect(result.hideOptions).toEqual([]);
    expect(result.fadeHide).toEqual({ fade: ['watching', 'collected'], hide: [] });
  });

  it('should offer partial options only on Shows and mixed searches', () => {
    expect(filters('shows').hideOptions.map(({ id }) => id)).toContain('collecting');
    for (const slug of ['movies', 'episodes', 'imdb']) {
      expect(filters(slug).options.map(({ id }) => id)).not.toContain('watching');
      expect(filters(slug).options.map(({ id }) => id)).not.toContain('collecting');
    }
    expect(filters('imdb').hideOptions).toEqual([]);
  });

  it('should hide the eye and ignore saved filters on People, Lists and Users', () => {
    for (const slug of ['people', 'lists', 'users']) {
      const result = filters(slug, 'hide=watched', { 'filter-fade-search': 'unwatched' });
      expect(result.visible).toBe(false);
      expect(result.fadeHide).toEqual({ fade: [], hide: [] });
    }
  });

  it('should share search cookies across tabs and discard invalid or unavailable options', () => {
    const saved = { 'filter-fade-search': 'watching,watched,bad', 'filter-hide-search': 'rated,collecting,bad' };
    expect(filters('shows', '', saved).fadeHide).toEqual({
      fade: ['watching', 'watched'],
      hide: ['rated', 'collecting'],
    });
    expect(filters('movies', '', saved).fadeHide).toEqual({ fade: ['watched'], hide: ['rated'] });
  });

  it('should let an explicit URL override the hide cookie, including Show All', () => {
    const saved = { 'filter-hide-search': 'rated' };
    expect(filters('shows', 'hide=watchlist,watched', saved).fadeHide.hide).toEqual(['watchlisted', 'watched']);
    expect(filters('shows', 'hide=', saved).fadeHide.hide).toEqual([]);
  });
});
