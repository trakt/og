import type { ChartCard } from '../charts/toChartCard.ts';

type Sample = readonly [id: number, slug: string, title: string, year: number, rating: number];

const card = (type: ChartCard['type']) => ([id, slug, title, year, rating]: Sample): ChartCard => ({
  type,
  id,
  href: `/${type}s/${slug}`,
  title,
  year,
  released: true,
  rating,
  runtime: type === 'show' ? 50 : 120,
  airedEpisodes: type === 'show' ? 40 : undefined,
  tags: [],
});

// Public titles with made-up ratings, for the design demo. No artwork, like local OG.
const shows: readonly Sample[] = [
  [1388, 'breaking-bad', 'Breaking Bad', 2008, 9.2],
  [1390, 'game-of-thrones', 'Game of Thrones', 2011, 8.9],
  [60300, 'the-bear', 'The Bear', 2022, 8.4],
  [158947, 'severance', 'Severance', 2022, 8.6],
  [1395, 'the-wire', 'The Wire', 2002, 9.1],
  [1409, 'the-sopranos', 'The Sopranos', 1999, 9.0],
  [139960, 'arcane', 'Arcane', 2021, 8.9],
  [154997, 'the-last-of-us', 'The Last of Us', 2023, 8.7],
  [1400, 'mad-men', 'Mad Men', 2007, 8.5],
  [101792, 'chernobyl', 'Chernobyl', 2019, 9.3],
];

const movies: readonly Sample[] = [
  [120, 'the-dark-knight-2008', 'The Dark Knight', 2008, 8.7],
  [1, 'inception-2010', 'Inception', 2010, 8.4],
  [16, 'heat-1995', 'Heat', 1995, 8.2],
  [481, 'the-matrix-1999', 'The Matrix', 1999, 8.5],
  [432, 'alien-1979', 'Alien', 1979, 8.3],
];

/** Ten shows fill all three rows; five movies stop at two. */
export const recommendationsFixture = { shows: shows.map(card('show')), movies: movies.map(card('movie')) };
