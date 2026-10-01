import { z } from 'zod/v4';

const ids = z.object({
  trakt: z.number(),
  slug: z.string().nullish(),
  imdb: z.string().nullish(),
  tmdb: z.number().nullish(),
});

const show = z.object({ type: z.literal('show'), title: z.string(), year: z.number().nullish(), ids });

/** The Trakt item a stored sync item resolved to by its TMDB id. */
const traktItem = z.discriminatedUnion('type', [
  z.object({ type: z.literal('movie'), title: z.string(), year: z.number().nullish(), ids }),
  show,
  z.object({
    type: z.literal('episode'),
    season: z.number(),
    number: z.number(),
    title: z.string().nullish(),
    ids,
    show: show.nullish(),
  }),
]);

/**
 * One paused or skipped item from `GET /users/syncs/:id/paused|skipped` (API): the item as the importer
 * stored it plus `kind`, `type` and `trakt_item`. Younify items carry the service, content id and progress; Plex items
 * carry `ids`, titles and their own dates.
 */
export const syncItemSchema = z.object({
  kind: z.enum(['history', 'rating']),
  type: z.string().nullish(),
  trakt_item: traktItem.nullish(),
  service_id: z.string().nullish(),
  content_id: z.string().nullish(),
  tmdb_id: z.number().nullish(),
  tmdb_series_id: z.number().nullish(),
  progress: z.number().nullish(),
  watched_at: z.string().nullish(),
  rated_at: z.string().nullish(),
  last_watched_at: z.string().nullish(),
  collected_at: z.string().nullish(),
  ids: z.object({ tmdb: z.union([z.number(), z.string()]).nullish(), imdb: z.string().nullish() }).nullish(),
  title: z.string().nullish(),
  show_title: z.string().nullish(),
  season_number: z.number().nullish(),
  number: z.number().nullish(),
  year: z.number().nullish(),
});
