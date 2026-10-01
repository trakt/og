import { z } from 'zod/v4';
import { collectionMetadataSchema } from '../../components/collection/collectionMetadataSchema.ts';
import { episode, movie, show } from '../history/historyRowsSchema.ts';

// The sorted cards' second line reads these.
const sortFields = { votes: z.number().nullish() };
const item = { collected_at: z.string(), metadata: collectionMetadataSchema.nullish() };

/**
 * `/users/:id/collection/{media,movies,episodes}?extended=full,images`. Read raw: `@trakt/api` 0.6.0 types the rows
 * as `{ type, collected_at }` and takes no `sort_by`, `sort_how`, `start_at` or `end_at`.
 */
export const libraryRowsSchema = z.array(z.union([
  z.object({ ...item, movie: movie.extend({ ...sortFields, released: z.string().nullish() }) }),
  z.object({
    ...item,
    episode: episode.extend({ ...sortFields, first_aired: z.string().nullish() }),
    show,
  }),
]));

/**
 * `/users/:id/collection/shows?extended=full,images`: one row a show with its collected episodes. It sends no images, so
 * the posters come from each show's summary.
 */
export const libraryShowsSchema = z.array(z.object({
  last_collected_at: z.string(),
  show,
  seasons: z.array(z.object({ episodes: z.array(z.unknown()) })).nullish(),
}));

export type LibraryRow = z.infer<typeof libraryRowsSchema>[number];
export type LibraryShowRow = z.infer<typeof libraryShowsSchema>[number];
