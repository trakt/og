/** Sorts supported by the ratings payload. Popularity needs OG's unavailable rank field. */
export const ratingSorts = {
  all: { added: 'Rated Date', rating: 'Rating' },
  movies: {
    added: 'Rated Date',
    rating: 'Rating',
    title: 'Title',
    released: 'Release Date',
    runtime: 'Runtime',
    percentage: 'Percentage',
    votes: 'Votes',
  },
  shows: {
    added: 'Rated Date',
    rating: 'Rating',
    title: 'Title',
    released: 'Release Date',
    runtime: 'Runtime',
    percentage: 'Percentage',
    votes: 'Votes',
  },
  seasons: {
    added: 'Rated Date',
    rating: 'Rating',
    title: 'Title',
    released: 'Release Date',
    percentage: 'Percentage',
    votes: 'Votes',
  },
  episodes: {
    added: 'Rated Date',
    rating: 'Rating',
    title: 'Title',
    released: 'Release Date',
    percentage: 'Percentage',
    votes: 'Votes',
  },
} as const;
