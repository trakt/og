import { describe, expect, it } from 'vitest';
import { chartLinks } from './chartLinks.ts';

const labels = (links: ReturnType<typeof chartLinks>) => links.map((link) => link.label);

describe('chartLinks', () => {
  it('should list the show charts in OG order, with recommendations only when signed in', () => {
    const params = { type: 'shows', current: 'trending', period: 'weekly', search: new URLSearchParams() } as const;

    expect(labels(chartLinks({ ...params, signedIn: false }))).toEqual([
      'Trending',
      'Anticipated',
      'Popular',
      'Favorited',
      'Watched',
      'Libraries',
    ]);
    expect(labels(chartLinks({ ...params, signedIn: true })).at(1)).toBe('Recommendations');
  });

  it('should end the movie charts with box office', () => {
    const links = chartLinks({
      type: 'movies',
      current: 'popular',
      period: 'weekly',
      search: new URLSearchParams(),
      signedIn: false,
    });

    expect(links.at(-1)).toEqual({ label: 'Box Office', href: '/movies/boxoffice', current: false });
  });

  it('should mark the current chart', () => {
    const links = chartLinks({
      type: 'shows',
      current: 'popular',
      period: 'weekly',
      search: new URLSearchParams(),
      signedIn: false,
    });

    expect(links.filter((link) => link.current).map((link) => link.label)).toEqual(['Popular']);
  });

  it('should keep the filters but drop page and cursor', () => {
    const search = new URLSearchParams('genres=drama&page=3&cursor=abc&years=2000-2010');
    const links = chartLinks({ type: 'movies', current: 'trending', period: 'weekly', search, signedIn: false });

    expect(links.at(0)?.href).toBe('/movies/trending?genres=drama&years=2000-2010');
    expect(links.find((link) => link.label === 'Watched')?.href).toBe(
      '/movies/watched/weekly?genres=drama&years=2000-2010',
    );
    expect(links.at(-1)?.href).toBe('/movies/boxoffice');
  });

  it('should keep the current period on the period charts and mark the current one', () => {
    const links = chartLinks({
      type: 'shows',
      current: 'watched',
      period: 'monthly',
      search: new URLSearchParams(),
      signedIn: false,
    });

    expect(links.slice(-3)).toEqual([
      { label: 'Favorited', href: '/shows/favorited/monthly', current: false },
      { label: 'Watched', href: '/shows/watched/monthly', current: true },
      { label: 'Libraries', href: '/shows/library/monthly', current: false },
    ]);
  });
});
