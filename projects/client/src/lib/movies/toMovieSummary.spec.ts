import type { ListedMovieResponse, ListResponse, MovieResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toMovieSummary } from './toMovieSummary.ts';

const movie = (slug: string, trakt: number, extra: Partial<MovieResponse> = {}) =>
  ({ title: slug, year: 1999, ids: { slug, trakt }, ...extra }) as MovieResponse;

const base = {
  movie: movie('fight-club-1999', 432, { released: '1999-10-15', rating: 8.73, votes: 56_049, status: 'released' }),
  ratings: null,
  stats: null,
  people: null,
  studios: [],
  releases: [],
  collection: null,
  rank: null,
  country: 'us',
  otherSiteRatings: true,
  earlyRatings: false,
  isVip: false,
  now: new Date('2026-09-29T00:00:00Z'),
};

describe('toMovieSummary', () => {
  describe('for a movie in a collection', () => {
    const list = { name: 'Star Wars Collection', ids: { slug: 'star-wars-collection', trakt: 6 } } as ListResponse;
    const item = (slug: string, trakt: number) => ({ movie: movie(slug, trakt) }) as ListedMovieResponse;
    const items = [item('star-wars-1977', 1), item('fight-club-1999', 432), item('return-of-the-jedi-1983', 3)];

    it('should link the collection and both neighbours', () => {
      const { collection } = toMovieSummary({ ...base, collection: { list, items } });

      expect(collection?.href).toBe('/lists/official/star-wars-collection');
      expect(collection?.previous).toEqual({
        href: '/movies/star-wars-1977',
        label: 'Previous in Star Wars Collection: star-wars-1977',
      });
      expect(collection?.next?.href).toBe('/movies/return-of-the-jedi-1983');
    });

    it('should have no previous link for the first movie', () => {
      const { collection } = toMovieSummary({ ...base, collection: { list, items: items.slice(1) } });

      expect(collection?.previous).toBeUndefined();
      expect(collection?.next?.href).toBe('/movies/return-of-the-jedi-1983');
    });
  });

  it('should take the earliest US physical release as the DVD date and count the others', () => {
    const { facts } = toMovieSummary({
      ...base,
      releases: [
        { country: 'us', release_date: '2026-05-12', release_type: 'physical' },
        { country: 'us', release_date: '2000-04-25', release_type: 'physical' },
        { country: 'gb', release_date: '1999-11-01', release_type: 'physical' },
      ],
    });

    expect(facts.dvd).toBe('2000-04-25');
    expect(facts.released).toEqual({ date: '1999-10-15', upcoming: false, more: 2 });
  });

  it('should hide the Trakt rating before the first release unless early ratings are on', () => {
    const upcoming = { ...base, movie: movie('x', 1, { released: '2027-01-01', rating: 7, votes: 3 }) };

    expect(toMovieSummary(upcoming).rating).toBeUndefined();
    expect(toMovieSummary({ ...upcoming, earlyRatings: true }).rating?.value).toBe(7);
    expect(toMovieSummary(base).rating).toEqual({ value: 8.73, votes: 56_049, href: '/movies/fight-club-1999/stats' });
  });

  it('should keep directors only and note non-writer jobs', () => {
    const person = (name: string) => ({ name, ids: { slug: name.toLowerCase(), trakt: 1 } });
    const { facts } = toMovieSummary({
      ...base,
      people: {
        crew: {
          directing: [
            { person: person('Fincher'), jobs: ['Director'] },
            { person: person('Topoozian'), jobs: ['First Assistant Director'] },
          ],
          writing: [{ person: person('Uhls'), jobs: ['Screenplay'] }, { person: person('Doe'), jobs: ['Writer'] }],
        },
      } as never,
    });

    expect(facts.directors).toEqual([{ name: 'Fincher', href: '/people/fincher' }]);
    expect(facts.writers.map(({ name, note }) => [name, note])).toEqual([['Uhls', 'screenplay'], ['Doe', undefined]]);
  });

  it('should link country, languages and genres for VIPs only', () => {
    const vip = { ...base, movie: movie('x', 1, { country: 'us', languages: ['en'], genres: ['science-fiction'] }) };

    expect(toMovieSummary(vip).facts.genres).toEqual([{ name: 'Science Fiction', href: undefined }]);
    expect(toMovieSummary({ ...vip, isVip: true }).facts.country).toEqual({
      name: 'United States',
      href: '/movies/popular?countries=us',
    });
    expect(toMovieSummary({ ...vip, isVip: true }).facts.languages.at(0)?.name).toBe('English');
  });

  it('should drop other sites when the viewer turned them off', () => {
    const ratings = { imdb: { rating: 8.8, votes: 10, link: 'https://imdb.com/title/tt1' } };

    expect(toMovieSummary({ ...base, ratings }).external).toHaveLength(1);
    expect(toMovieSummary({ ...base, ratings, otherSiteRatings: false }).external).toEqual([]);
  });
});
