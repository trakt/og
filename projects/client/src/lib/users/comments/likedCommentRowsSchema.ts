// FIXME(zod-4): og has one zod, the one @trakt/api depends on. See `src/lib/users/notes/noteRowsSchema.ts`.
import { z } from 'zod/v4';
import { commentSchema as comment } from '../../components/comments/commentSchema.ts';
import type { UserCommentRow } from './UserCommentRow.ts';

const rating = z.number().nullish();
const posters = z.object({ poster: z.array(z.string()).nullish() }).nullish();
const titled = {
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  title: z.string(),
  year: z.number().nullish(),
};

const row = z.object({
  /** The commented item's class, lowercased: `movie`, `show`, `season`, `episode`, `list` or `officiallist`. */
  comment_type: z.string().nullish(),
  comment,
  movie: z.object({ ...titled, rating, images: posters }).nullish(),
  show: z.object({
    ...titled,
    rating,
    aired_episodes: z.number().nullish(),
    genres: z.array(z.string()).nullish(),
    images: posters,
  }).nullish(),
  season: z.object({
    ids: z.object({ trakt: z.number() }),
    number: z.number(),
    title: z.string().nullish(),
    rating,
    aired_episodes: z.number().nullish(),
    images: posters,
  }).nullish(),
  episode: z.object({
    ids: z.object({ trakt: z.number() }),
    season: z.number(),
    number: z.number(),
    number_abs: z.number().nullish(),
    title: z.string().nullish(),
    rating,
    images: z.object({ screenshot: z.array(z.string()).nullish() }).nullish(),
  }).nullish(),
  list: z.object({
    name: z.string(),
    privacy: z.string().nullish(),
    ids: z.object({ trakt: z.number(), slug: z.string().nullish() }),
    user: z.object({ ids: z.object({ slug: z.string().nullish() }) }).nullish(),
    images: z.object({ posters: z.array(z.string()).nullish() }).nullish(),
  }).nullish(),
});

/**
 * `/users/:id/likes/comments?extended=comments,full,images`, which API answers:
 * each like's comment with the media it's about beside it, under the key its `comment_type` names. Mapped to the
 * rows `/users/:id/comments` returns, with official lists as lists.
 */
export const likedCommentRowsSchema = z.array(row).transform((rows) =>
  rows.map(({ comment_type: type, ...media }): UserCommentRow => ({
    ...media,
    type: type === 'officiallist' ? 'list' : type ?? '',
  }))
);
