import type { UpNextEntry } from './UpNextEntry.ts';

type Sample = {
  id: number;
  slug: string;
  title: string;
  season: number;
  number: number;
  numberAbs?: number;
  episodeTitle: string;
  episodeType?: 'standard' | 'season_premiere' | 'season_finale' | 'mid_season_finale' | 'series_premiere';
  genres?: ('drama' | 'comedy' | 'anime' | 'animation')[];
  runtime: number;
  aired: number;
  completed: number;
  plays: number;
  resetAt?: string;
};

// Public shows with made-up progress, for the design demo and the specs. No artwork, like local OG.
const samples: readonly Sample[] = [
  {
    id: 1388,
    slug: 'breaking-bad',
    title: 'Breaking Bad',
    season: 2,
    number: 5,
    episodeTitle: 'Breakage',
    genres: ['drama'],
    runtime: 47,
    aired: 62,
    completed: 11,
    plays: 11,
  },
  {
    id: 1390,
    slug: 'game-of-thrones',
    title: 'Game of Thrones',
    season: 3,
    number: 1,
    episodeTitle: 'Valar Dohaeris',
    episodeType: 'season_premiere',
    genres: ['drama'],
    runtime: 55,
    aired: 73,
    completed: 20,
    plays: 22,
  },
  {
    id: 1409,
    slug: 'the-office',
    title: 'The Office',
    season: 2,
    number: 22,
    episodeTitle: 'Casino Night',
    episodeType: 'season_finale',
    genres: ['comedy'],
    runtime: 22,
    aired: 201,
    completed: 27,
    plays: 30,
  },
  {
    id: 60300,
    slug: 'attack-on-titan',
    title: 'Attack on Titan',
    season: 2,
    number: 3,
    numberAbs: 28,
    episodeTitle: 'Southwestward',
    genres: ['anime', 'animation'],
    runtime: 24,
    aired: 94,
    completed: 27,
    plays: 27,
  },
  {
    id: 1394,
    slug: 'lost-2004',
    title: 'Lost',
    season: 1,
    number: 6,
    episodeTitle: 'House of the Rising Sun',
    genres: ['drama'],
    runtime: 43,
    aired: 118,
    completed: 5,
    plays: 123,
    resetAt: '2026-08-01T20:00:00.000Z',
  },
  {
    id: 1421,
    slug: 'the-wire',
    title: 'The Wire',
    season: 1,
    number: 1,
    episodeTitle: 'The Target',
    episodeType: 'series_premiere',
    genres: ['drama'],
    runtime: 60,
    aired: 60,
    completed: 0,
    plays: 0,
  },
  {
    id: 1395,
    slug: 'mad-men',
    title: 'Mad Men',
    season: 4,
    number: 7,
    episodeTitle: 'The Suitcase',
    episodeType: 'mid_season_finale',
    genres: ['drama'],
    runtime: 48,
    aired: 92,
    completed: 45,
    plays: 45,
  },
  {
    id: 1502,
    slug: 'arrested-development',
    title: 'Arrested Development',
    season: 1,
    number: 14,
    episodeTitle: 'Shock and Aww',
    genres: ['comedy'],
    runtime: 22,
    aired: 84,
    completed: 13,
    plays: 13,
  },
];

function toEntry(sample: Sample, lifetime = false): UpNextEntry {
  const rewatchLifetime = lifetime && sample.resetAt;
  const completed = rewatchLifetime ? sample.aired : sample.completed;
  const plays = rewatchLifetime ? sample.plays : Math.min(sample.plays, sample.completed);

  return {
    show: {
      title: sample.title,
      year: null,
      ids: { trakt: sample.id, slug: sample.slug },
      genres: sample.genres,
      runtime: sample.runtime,
    },
    progress: {
      aired: sample.aired,
      completed,
      last_watched_at: '2026-09-28T20:00:00.000Z',
      reset_at: sample.resetAt ?? null,
      last_episode: null,
      next_episode: {
        season: sample.season,
        number: sample.number,
        number_abs: sample.numberAbs ?? null,
        title: sample.episodeTitle,
        episode_type: sample.episodeType ?? 'standard',
        runtime: sample.runtime,
        rating: 8.1,
        ids: { trakt: sample.id * 100 + sample.number },
      },
      stats: {
        play_count: plays,
        minutes_watched: plays * sample.runtime,
        minutes_left: (sample.aired - completed) * sample.runtime,
      },
    },
  };
}

/** Sample `/sync/progress/up_next` responses: the default request, and the same with `lifetime_stats=true`. */
export const upNextFixture = {
  entries: samples.map((sample) => toEntry(sample)),
  lifetime: samples.map((sample) => toEntry(sample, true)),
};
