import type { ProgressRowData } from './progressRowsSchema.ts';

type Sample = {
  id: number;
  slug: string;
  title: string;
  year: number;
  status: string;
  genres?: string[];
  runtime: number;
  /** Each season's episodes, true once watched. */
  seasons: readonly (readonly boolean[])[];
  seasonTitles?: readonly (string | null)[];
  /** Extra plays on top of one a watched episode. */
  rewatches?: number;
  resetAt?: string;
  next?: { season: number; number: number; title: string; type?: string };
};

// Public shows with made-up progress, for the specs and the design demo. No artwork, like local OG.
const samples: readonly Sample[] = [
  {
    id: 1388,
    slug: 'breaking-bad',
    title: 'Breaking Bad',
    year: 2008,
    status: 'ended',
    genres: ['drama'],
    runtime: 47,
    seasons: [Array(7).fill(true), [
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]],
    rewatches: 2,
    next: { season: 2, number: 5, title: 'Breakage' },
  },
  {
    id: 1390,
    slug: 'game-of-thrones',
    title: 'Game of Thrones',
    year: 2011,
    status: 'ended',
    genres: ['drama'],
    runtime: 55,
    seasons: [Array(10).fill(true), Array(10).fill(true), Array(10).fill(false)],
    resetAt: '2026-07-02T20:00:00.000Z',
    next: { season: 3, number: 1, title: 'Valar Dohaeris', type: 'season_premiere' },
  },
  {
    id: 1421,
    slug: 'the-wire',
    title: 'The Wire',
    year: 2002,
    status: 'ended',
    genres: ['drama'],
    runtime: 60,
    seasons: [Array(13).fill(true)],
    seasonTitles: ['The Streets'],
  },
  {
    id: 60300,
    slug: 'severance',
    title: 'Severance',
    year: 2022,
    status: 'returning series',
    genres: ['drama'],
    runtime: 50,
    seasons: [Array(9).fill(true), Array(10).fill(true)],
  },
];

const at = (season: number, number: number) => new Date(Date.UTC(2026, 8, 1 + season, 20, number)).toISOString();

function toRow(sample: Sample, collected: boolean): ProgressRowData {
  const episodes = sample.seasons.flatMap((season, s) =>
    season.map((done, e) => ({ season: s + 1, number: e + 1, done }))
  );
  const done = episodes.filter((episode) => episode.done);
  const plays = done.length + (sample.rewatches ?? 0);
  const last = done.at(-1);
  const show = {
    ids: { trakt: sample.id, slug: sample.slug },
    title: sample.title,
    year: sample.year,
    status: sample.status,
    genres: sample.genres,
    runtime: sample.runtime,
    rating: 8.4,
  };
  const episode = (season: number, number: number, title: string, type?: string) => ({
    ids: { trakt: sample.id * 100 + season * 20 + number },
    season,
    number,
    title,
    episode_type: type ?? 'standard',
    first_aired: at(season, number),
    runtime: sample.runtime,
    rating: 8.1,
  });

  return {
    show,
    progress: {
      aired: episodes.length,
      completed: done.length,
      ...(collected ? { last_collected_at: last ? at(last.season, last.number) : null } : {
        stats: {
          play_count: plays,
          minutes_watched: plays * sample.runtime,
          minutes_left: (episodes.length - done.length) * sample.runtime,
        },
        last_watched_at: last ? at(last.season, last.number) : null,
        reset_at: sample.resetAt ?? null,
      }),
      last_episode: last ? episode(last.season, last.number, `Episode ${last.number}`) : null,
      next_episode: sample.next
        ? episode(sample.next.season, sample.next.number, sample.next.title, sample.next.type)
        : null,
      seasons: sample.seasons.map((season, s) => {
        const count = season.filter(Boolean).length;
        return {
          number: s + 1,
          title: sample.seasonTitles?.[s] ?? `Season ${s + 1}`,
          aired: season.length,
          completed: count,
          ...(!collected && {
            stats: {
              play_count: count,
              minutes_watched: count * sample.runtime,
              minutes_left: (season.length - count) * sample.runtime,
            },
          }),
          episodes: season.map((isDone, e) => ({
            number: e + 1,
            completed: isDone,
            ...(collected ? { collected_at: isDone ? at(s + 1, e + 1) : null } : {
              last_watched_at: isDone ? at(s + 1, e + 1) : null,
              stats: { play_count: isDone ? 1 : 0, minutes_watched: isDone ? sample.runtime : 0 },
            }),
          })),
        };
      }),
    },
  };
}

const dropped = [
  { id: 1390, at: '2025-12-01T21:40:00.000Z' },
  { id: 60300, at: '2025-04-17T17:53:00.000Z' },
];

/**
 * Sample `/users/:id/progress/watched` and `/collection` rows with `include_seasons=true`, and the `/users/hidden/dropped`
 * rows that drop two of them.
 */
export const progressFixture = {
  watched: samples.map((sample) => toRow(sample, false)),
  collection: samples.map((sample) => toRow(sample, true)),
  dropped: dropped.flatMap(({ id, at }) => {
    const sample = samples.find((candidate) => candidate.id === id);
    if (!sample) return [];
    return [{
      hidden_at: at,
      type: 'show' as const,
      show: { title: sample.title, year: sample.year, ids: { trakt: sample.id, slug: sample.slug } },
    }];
  }),
};
