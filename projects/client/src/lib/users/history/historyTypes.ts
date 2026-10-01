/** OG's history type dropdown. */
export const historyTypes = {
  all: 'All Types',
  movies: 'Movies',
  shows: 'Shows',
  episodes: 'Episodes',
} as const;

export type HistoryType = keyof typeof historyTypes;

export const isHistoryType = (value: string): value is HistoryType => Object.hasOwn(historyTypes, value);

// OG's MOVIE_GENRES and TV_GENRES, the genres dropdown's options.
const shared = {
  action: 'Action',
  adventure: 'Adventure',
  animation: 'Animation',
  anime: 'Anime',
} as const;

export const movieGenres: Readonly<Record<string, string>> = {
  ...shared,
  comedy: 'Comedy',
  crime: 'Crime',
  documentary: 'Documentary',
  donghua: 'Donghua',
  drama: 'Drama',
  family: 'Family',
  fantasy: 'Fantasy',
  history: 'History',
  holiday: 'Holiday',
  horror: 'Horror',
  music: 'Music',
  musical: 'Musical',
  mystery: 'Mystery',
  romance: 'Romance',
  'science-fiction': 'Science Fiction',
  short: 'Short',
  'sporting-event': 'Sporting Event',
  superhero: 'Superhero',
  suspense: 'Suspense',
  thriller: 'Thriller',
  war: 'War',
  western: 'Western',
};

export const tvGenres: Readonly<Record<string, string>> = {
  ...shared,
  children: 'Children',
  comedy: 'Comedy',
  crime: 'Crime',
  documentary: 'Documentary',
  donghua: 'Donghua',
  drama: 'Drama',
  family: 'Family',
  fantasy: 'Fantasy',
  'game-show': 'Game Show',
  history: 'History',
  holiday: 'Holiday',
  'home-and-garden': 'Home & Garden',
  horror: 'Horror',
  music: 'Music',
  mystery: 'Mystery',
  news: 'News',
  reality: 'Reality',
  romance: 'Romance',
  'science-fiction': 'Science Fiction',
  soap: 'Soap',
  'special-interest': 'Special Interest',
  'sporting-event': 'Sporting Event',
  superhero: 'Superhero',
  suspense: 'Suspense',
  'talk-show': 'Talk Show',
  thriller: 'Thriller',
  war: 'War',
  western: 'Western',
};

/** The genres a type filters by. All Types has none. */
export const genresFor = (type: HistoryType) => type === 'movies' ? movieGenres : type === 'all' ? undefined : tvGenres;
