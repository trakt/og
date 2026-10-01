import type { WatchedGenreRow } from '../users/profile/watchedGenresSchema.ts';

type Ids = { ids: { trakt: number }; runtime: number };

// Made-up plays for the demo route, oldest day first: how many episodes, one of them a replay on the busiest day,
// and the odd movie. Runtimes cycle through a few common lengths.
const EPISODES = [2, 0, 3, 1, 0, 4, 2, 0, 1, 5, 3, 0, 2, 1, 6, 0, 2, 3, 1, 0, 4, 2, 1, 0, 3, 8, 2, 1, 0, 2];
const MOVIES: Readonly<Record<number, number>> = { 4: 118, 11: 95, 19: 132, 23: 104, 28: 88 };
const RUNTIMES = [22, 42, 45, 58, 60];
const REPLAY_DAY = 25;
const DAY = 86_400_000;

const genre = (slug: string, name: string, [episodes, shows, movies]: readonly [number, number, number]) => ({
  slug,
  name,
  counts: { episodes, shows, movies },
});

const GENRES = [
  genre('drama', 'Drama', [34, 5, 2]),
  genre('science-fiction', 'Science Fiction', [22, 3, 1]),
  genre('comedy', 'Comedy', [18, 3, 0]),
  genre('action', 'Action', [12, 2, 2]),
  genre('crime', 'Crime', [9, 1, 1]),
  genre('fantasy', 'Fantasy', [7, 1, 0]),
  genre('thriller', 'Thriller', [0, 0, 2]),
];

const ids = (count: number, from: number) => Array.from({ length: count }, (_, i) => from + i);

function genres(): WatchedGenreRow[] {
  const plays = GENRES.map(({ counts }) => counts.episodes + counts.movies);
  const total = plays.reduce((sum, n) => sum + n, 0);
  const top = Math.max(...plays);

  return GENRES.map(({ slug, name, counts }, i) => {
    const played = plays.at(i) ?? 0;
    return {
      play_count: played,
      genre: { slug, name },
      percentage: (played / total) * 100,
      percentage_row: (played / top) * 100,
      episodes: { play_count: counts.episodes, ids: ids(counts.episodes, i * 100) },
      shows: { play_count: counts.episodes, ids: ids(counts.shows, i * 100) },
      movies: { play_count: counts.movies, ids: ids(counts.movies, i * 100) },
    };
  });
}

/** The 30 days up to `today` (`YYYY-MM-DD`), played at noon UTC, and the genres they add up to. */
function rows(today: string) {
  const dateOf = (i: number) =>
    new Date(Date.parse(`${today}T12:00:00Z`) - (EPISODES.length - 1 - i) * DAY).toISOString();
  const media = (id: number, runtime: number): Ids => ({ ids: { trakt: id }, runtime });

  const episodes = EPISODES.flatMap((count, day) =>
    Array.from({ length: count }, (_, n) => ({
      watched_at: dateOf(day),
      // The replay day plays its first two episodes twice.
      episode: media(day * 10 + (day === REPLAY_DAY && n >= count - 2 ? n - (count - 2) : n), RUNTIMES[day % 5] ?? 42),
      show: { runtime: 42 },
    }))
  );
  const movies = Object.entries(MOVIES).map(([day, runtime]) => ({
    watched_at: dateOf(Number(day)),
    movie: media(1_000 + Number(day), runtime),
  }));

  return { episodes, movies, genres: genres() };
}

export const lastThirtyDaysFixture = { rows };
