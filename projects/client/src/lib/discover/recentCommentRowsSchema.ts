// FIXME(zod-4): og has one zod, the one @trakt/api depends on. See `src/lib/users/notes/noteRowsSchema.ts`.
import { z } from 'zod/v4';
import { commentSchema } from '../components/comments/commentSchema.ts';

const fanart = z.object({ fanart: z.array(z.string()).nullish() }).nullish();
const titled = {
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  title: z.string(),
  year: z.number().nullish(),
  images: fanart,
};

const row = z.object({
  type: z.string(),
  comment: commentSchema,
  movie: z.object(titled).nullish(),
  show: z.object({
    ...titled,
    aired_episodes: z.number().nullish(),
    genres: z.array(z.string()).nullish(),
  }).nullish(),
  season: z.object({
    ids: z.object({ trakt: z.number() }),
    number: z.number(),
    first_aired: z.string().nullish(),
    aired_episodes: z.number().nullish(),
  }).nullish(),
  episode: z.object({
    ids: z.object({ trakt: z.number() }),
    season: z.number(),
    number: z.number(),
    number_abs: z.number().nullish(),
    title: z.string().nullish(),
    first_aired: z.string().nullish(),
  }).nullish(),
  list: z.object({
    name: z.string(),
    type: z.string().nullish(),
    ids: z.object({ trakt: z.number(), slug: z.string().nullish() }),
    user: z.object({ ids: z.object({ slug: z.string().nullish() }) }).nullish(),
  }).nullish(),
});

export type RecentCommentRow = z.infer<typeof row>;

/**
 * `/comments/recent/:comment_type/:type?extended=images`: each comment with the media it's about under the key its
 * `type` names, and the show beside a season or episode. `@trakt/api` 0.6.0 types the rows as bare comments, so
 * they're parsed here. A malformed row is skipped instead of failing the block.
 */
export const recentCommentRowsSchema = z.array(z.unknown()).transform((rows) =>
  rows.flatMap((value): RecentCommentRow[] => {
    const parsed = row.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  })
);
