import { z } from 'zod/v4';

const media = z.object({ ids: z.object({ trakt: z.number() }) });

/**
 * API's `/users/hidden/calendar`: one row a hidden show or movie. @trakt/api
 * 0.6.0 types every hidden row as a show, so the loader parses it here.
 */
export const hiddenCalendarSchema = z.array(z.object({
  type: z.string(),
  show: media.nullish(),
  movie: media.nullish(),
}));
