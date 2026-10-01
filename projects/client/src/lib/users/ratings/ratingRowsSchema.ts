import { z } from 'zod/v4';
import { episode, images, movie, show } from '../history/historyRowsSchema.ts';

const fields = { votes: z.number().nullish(), released: z.string().nullish(), first_aired: z.string().nullish() };
const rated = { rated_at: z.string().datetime({ offset: true }), rating: z.number().int().min(1).max(10) };
const season = z.object({
  ids: z.object({ trakt: z.number() }),
  number: z.number(),
  title: z.string().nullish(),
  images,
  aired_episodes: z.number().nullish(),
  rating: z.number().nullish(),
  ...fields,
});

/**
 * Raw for limit=all and /ratings/seasons: @trakt/api 0.6.0 has no string-limit or unfiltered season contract.
 * Also parses typed responses so API responses and the season's extra full/image fields cross a validated boundary.
 * Deleted media are null; the mapper skips those cards as OG did.
 */
export const ratingRowsSchema = z.array(z.discriminatedUnion('type', [
  z.object({ ...rated, type: z.literal('movie'), movie: movie.extend(fields).nullish() }),
  z.object({ ...rated, type: z.literal('show'), show: show.extend(fields).nullish() }),
  z.object({ ...rated, type: z.literal('season'), season: season.nullish(), show: show.extend(fields).nullish() }),
  z.object({
    ...rated,
    type: z.literal('episode'),
    episode: episode.extend(fields).nullish(),
    show: show.extend(fields).nullish(),
  }),
]));
