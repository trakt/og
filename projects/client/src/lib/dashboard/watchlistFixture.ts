import type { ListItemRow } from '../lists/listItemRowsSchema.ts';

type Media = { id: number; slug: string; title: string; year: number; rating: number; votes: number };

const movie = (m: Media & { released: string; runtime: number }, i: number): ListItemRow => ({
  type: 'movie',
  id: 9000 + i,
  rank: i + 1,
  listed_at: `2026-09-${String(28 - i).padStart(2, '0')}T20:15:00.000Z`,
  movie: {
    title: m.title,
    year: m.year,
    ids: { trakt: m.id, slug: m.slug },
    runtime: m.runtime,
    released: m.released,
    rating: m.rating,
    votes: m.votes,
  },
});

const show = (m: Media & { firstAired: string; totalRuntime: number; aired: number }, i: number): ListItemRow => ({
  type: 'show',
  id: 9000 + i,
  rank: i + 1,
  listed_at: `2026-09-${String(28 - i).padStart(2, '0')}T20:15:00.000Z`,
  show: {
    title: m.title,
    year: m.year,
    ids: { trakt: m.id, slug: m.slug },
    first_aired: m.firstAired,
    total_runtime: m.totalRuntime,
    aired_episodes: m.aired,
    rating: m.rating,
    votes: m.votes,
    genres: ['drama'],
  },
});

const breakingBad = {
  title: 'Breaking Bad',
  year: 2008,
  ids: { trakt: 1388, slug: 'breaking-bad' },
  genres: ['drama'],
};

// Public titles with made-up dates, for the design demo and the specs. No artwork, like local OG.
const rows: readonly ListItemRow[] = [
  movie({
    id: 120,
    slug: 'the-dark-knight-2008',
    title: 'The Dark Knight',
    year: 2008,
    rating: 8.7,
    votes: 91_000,
    released: '2008-07-18',
    runtime: 152,
  }, 0),
  show({
    id: 1390,
    slug: 'game-of-thrones',
    title: 'Game of Thrones',
    year: 2011,
    rating: 8.9,
    votes: 120_000,
    firstAired: '2011-04-18T01:00:00.000Z',
    totalRuntime: 4_200,
    aired: 73,
  }, 1),
  {
    type: 'season',
    id: 9002,
    rank: 3,
    listed_at: '2026-09-26T20:15:00.000Z',
    show: breakingBad,
    season: {
      number: 1,
      ids: { trakt: 3950 },
      first_aired: '2008-01-21T02:00:00.000Z',
      total_runtime: 329,
      aired_episodes: 7,
      rating: 8.6,
      votes: 4_200,
    },
  },
  {
    type: 'episode',
    id: 9003,
    rank: 4,
    listed_at: '2026-09-25T20:15:00.000Z',
    show: breakingBad,
    episode: {
      title: 'Ozymandias',
      season: 5,
      number: 14,
      episode_type: 'standard',
      ids: { trakt: 62161 },
      runtime: 48,
      first_aired: '2013-09-16T01:00:00.000Z',
      rating: 9.6,
      votes: 12_000,
    },
  },
  movie({
    id: 1,
    slug: 'inception-2010',
    title: 'Inception',
    year: 2010,
    rating: 8.4,
    votes: 88_000,
    released: '2010-07-16',
    runtime: 148,
  }, 4),
  show({
    id: 1395,
    slug: 'the-office-us',
    title: 'The Office',
    year: 2005,
    rating: 8.6,
    votes: 70_000,
    firstAired: '2005-03-24T05:00:00.000Z',
    totalRuntime: 4_000,
    aired: 188,
  }, 5),
  movie({
    id: 481,
    slug: 'interstellar-2014',
    title: 'Interstellar',
    year: 2014,
    rating: 8.6,
    votes: 80_000,
    released: '2014-11-07',
    runtime: 169,
  }, 6),
  show({
    id: 60300,
    slug: 'the-bear',
    title: 'The Bear',
    year: 2022,
    rating: 8.2,
    votes: 9_000,
    firstAired: '2022-06-23T04:00:00.000Z',
    totalRuntime: 1_000,
    aired: 38,
  }, 7),
];

/** Eight sample watchlist items, enough for two rows of six. */
export const watchlistFixture = { rows, total: 33 };
