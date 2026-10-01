import { z } from 'zod/v4';

/** Shared count fields; movies and shows also expose favorited. Parses any API stats at the boundary. */
export const mediaStatsSchema = z.object({
  watchers: z.number().int().nonnegative(),
  plays: z.number().int().nonnegative(),
  collectors: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  lists: z.number().int().nonnegative(),
  votes: z.number().int().nonnegative(),
  favorited: z.number().int().nonnegative().optional(),
});
