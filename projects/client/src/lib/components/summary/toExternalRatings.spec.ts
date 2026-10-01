import { describe, expect, it } from 'vitest';
import { toExternalRatings } from './toExternalRatings.ts';

const ratings = {
  imdb: { rating: 8.84, votes: 2_567_341, link: 'https://www.imdb.com/title/tt0137523' },
  tmdb: { rating: 8.437, votes: 32_938, link: 'https://www.themoviedb.org/movie/550' },
  metascore: { rating: 67, link: 'https://www.imdb.com/title/tt0137523/criticreviews' },
  rotten_tomatoes: {
    rating: 81,
    state: 'fresh',
    user_rating: 96,
    user_state: 'upright',
    link: 'https://www.rottentomatoes.com/m/fight_club',
  },
};

describe('toExternalRatings', () => {
  it('should list every site with a score, in OG order', () => {
    const result = toExternalRatings({
      ratings,
      rank: { rank: 74, delta: 15, link: 'https://www.justwatch.com/us/movie/x' },
      countryName: 'United States',
    });

    expect(result.map(({ logo, rating, votes }) => [logo, rating, votes])).toEqual([
      ['imdb', '8.8', '2.6m'],
      ['tmdb', '84%', '32.9k'],
      ['tomatometer-fresh', '81%', 'Fresh'],
      ['audience-upright', '96%', 'Audience'],
      ['metacritic', '67', undefined],
      ['justwatch', '74', 'United States'],
    ]);
    expect(result.at(0)?.href).toBe('https://www.imdb.com/title/tt0137523/ratings');
    expect(result.at(-1)?.delta).toBe('+15');
  });

  it('should skip sites without a score or a link', () => {
    const result = toExternalRatings({
      ratings: { imdb: { rating: 0, votes: 0, link: 'x' }, tmdb: { rating: 7, votes: 1, link: null } },
      rank: { rank: null, delta: null, link: 'x' },
    });

    expect(result).toEqual([]);
  });

  it('should pick the Rotten Tomatoes logo from the state and score', () => {
    const logos = (state: string, rating: number, userState: string) =>
      toExternalRatings({
        ratings: { rotten_tomatoes: { rating, state, user_rating: 50, user_state: userState, link: 'x' } },
      }).map(({ logo }) => logo);

    expect(logos('certified', 95, 'certified')).toEqual(['tomatometer-certified', 'audience-certified']);
    expect(logos('rotten', 30, 'spilled')).toEqual(['tomatometer-rotten', 'audience-spilled']);
    expect(logos('rotten', 60, '')).toEqual(['tomatometer-fresh', 'audience-upright']);
  });

  it('should band the metascore', () => {
    const band = (rating: number) =>
      toExternalRatings({ ratings: { metascore: { rating, link: 'x' } } }).at(0)?.metascore;

    expect([band(70), band(40), band(39)]).toEqual(['high', 'medium', 'low']);
  });

  it('should sign a zero or negative rank change', () => {
    const delta = (value: number) =>
      toExternalRatings({ ratings: null, rank: { rank: 1, delta: value, link: 'x' } }).at(0)?.delta;

    expect([delta(0), delta(-113)]).toEqual(['+0', '-113']);
  });
});
