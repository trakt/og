import type { HistoryRow } from '../users/history/historyRowsSchema.ts';

const show = (id: number, slug: string, title: string, year: number) => ({
  ids: { trakt: id, slug },
  title,
  year,
  runtime: 50,
  rating: 8.8,
  genres: ['drama'],
});

const episode = (
  id: number,
  season: number,
  number: number,
  title: string,
  type = 'standard',
) => ({ ids: { trakt: id }, season, number, title, episode_type: type, runtime: 50, rating: 8.5 });

const at = (day: number, time: string) => `2026-09-${String(day).padStart(2, '0')}T${time}:00.000Z`;

// Public titles with made-up plays, for the design demo and the specs. No artwork, like local OG.
const rows: readonly HistoryRow[] = [
  {
    id: 801,
    watched_at: at(29, '02:09'),
    episode: episode(5000, 2, 1, 'The Ascent', 'season_premiere'),
    show: show(1390, 'game-of-thrones', 'Game of Thrones', 2011),
  },
  {
    id: 802,
    watched_at: at(28, '20:09'),
    movie: {
      ids: { trakt: 120, slug: 'the-dark-knight-2008' },
      title: 'The Dark Knight',
      year: 2008,
      runtime: 152,
      rating: 8.7,
    },
  },
  {
    id: 803,
    watched_at: at(27, '21:26'),
    episode: episode(5001, 5, 14, 'Ozymandias'),
    show: show(1388, 'breaking-bad', 'Breaking Bad', 2008),
  },
  {
    id: 804,
    watched_at: at(26, '19:40'),
    episode: episode(5002, 1, 10, 'Braindead', 'season_finale'),
    show: show(60300, 'the-bear', 'The Bear', 2022),
  },
  {
    id: 805,
    watched_at: at(25, '22:00'),
    movie: { ids: { trakt: 1, slug: 'inception-2010' }, title: 'Inception', year: 2010, runtime: 148, rating: 8.4 },
  },
];

/** Five sample plays, enough for two rows of three. */
export const recentlyWatchedFixture = { rows };
