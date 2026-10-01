import { z } from 'zod/v4';

const counts = z.object({
  movies: z.number().nullish(),
  episodes: z.number().nullish(),
  shows: z.number().nullish(),
  seasons: z.number().nullish(),
});

/**
 * One row of `GET /users/syncs(/:type)` or `/users/syncs/:id` : the
 * added counts per section, and the paused and skipped totals across every section.
 */
export const syncSchema = z.object({
  id: z.number(),
  created_at: z.iso.datetime({ offset: true }),
  kind: z.enum(['younify', 'plex', 'import']),
  source: z.string().nullish(),
  application: z.string().nullish(),
  undone: z.boolean(),
  items: z.object({
    history: counts.nullish(),
    library: counts.nullish(),
    ratings: counts.nullish(),
    watchlist: counts.nullish(),
  }),
  paused_count: z.number(),
  skipped_count: z.number(),
});
