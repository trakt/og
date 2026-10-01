import { z } from 'zod/v4';
import { images } from '../history/historyRowsSchema.ts';

const episode = z.object({
  ids: z.object({ trakt: z.number() }),
  season: z.number(),
  number: z.number(),
  number_abs: z.number().nullish(),
  title: z.string().nullish(),
  episode_type: z.string().nullish(),
  first_aired: z.string().nullish(),
  runtime: z.number().nullish(),
  rating: z.number().nullish(),
  images,
});

const plays = { play_count: z.number(), minutes_watched: z.number() };

/**
 * `/users/:id/progress/{watched,collection}/:sort_by/:sort_how?include_seasons=true&extended=full,images`
 * @trakt/api
 * 0.6.0 has no contract for another user's progress. Watched rows carry `stats`, `last_watched_at` and `reset_at`;
 * library rows carry `last_collected_at` and each episode's `collected_at`.
 */
export const progressRowsSchema = z.array(z.object({
  show: z.object({
    ids: z.object({ trakt: z.number(), slug: z.string() }),
    title: z.string(),
    year: z.number().nullish(),
    status: z.string().nullish(),
    genres: z.array(z.string()).nullish(),
    runtime: z.number().nullish(),
    rating: z.number().nullish(),
    images,
  }),
  progress: z.object({
    aired: z.number(),
    completed: z.number(),
    stats: z.object({ ...plays, minutes_left: z.number() }).nullish(),
    last_watched_at: z.string().nullish(),
    last_collected_at: z.string().nullish(),
    reset_at: z.string().nullish(),
    last_episode: episode.nullish(),
    next_episode: episode.nullish(),
    seasons: z.array(z.object({
      number: z.number(),
      title: z.string().nullish(),
      aired: z.number(),
      completed: z.number(),
      stats: z.object({ ...plays, minutes_left: z.number() }).nullish(),
      episodes: z.array(z.object({
        number: z.number(),
        completed: z.boolean(),
        last_watched_at: z.string().nullish(),
        collected_at: z.string().nullish(),
        stats: z.object(plays).nullish(),
      })),
    })).nullish(),
  }),
}));

export type ProgressRowData = z.infer<typeof progressRowsSchema>[number];
