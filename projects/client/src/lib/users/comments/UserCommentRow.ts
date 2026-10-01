import type { CommentResponse } from '@trakt/api';

type Poster = { readonly poster?: readonly string[] | null } | null;

/**
 * A comment beside the media it's about, as `/users/:id/comments` (native) and `/users/:id/likes/comments` (API)
 * both return it: the `type` and the media under that key, with the show next to a season or episode. Only the fields
 * og reads, so both routes' rows fit it. The worker sends list comments too, which `@trakt/api` 0.6.0 doesn't type.
 */
export type UserCommentRow = {
  readonly type: string;
  readonly comment: CommentResponse;
  readonly movie?: {
    readonly rating?: number | null;
    readonly ids: { readonly trakt: number; readonly slug: string };
    readonly title: string;
    readonly year?: number | null;
    readonly images?: Poster;
  } | null;
  readonly show?: {
    readonly rating?: number | null;
    readonly ids: { readonly trakt: number; readonly slug: string };
    readonly title: string;
    readonly year?: number | null;
    readonly aired_episodes?: number | null;
    readonly genres?: readonly string[] | null;
    readonly images?: Poster;
  } | null;
  readonly season?: {
    readonly rating?: number | null;
    readonly ids: { readonly trakt: number };
    readonly number: number;
    readonly title?: string | null;
    readonly aired_episodes?: number | null;
    readonly images?: Poster;
  } | null;
  readonly episode?: {
    readonly rating?: number | null;
    readonly ids: { readonly trakt: number };
    readonly season: number;
    readonly number: number;
    readonly number_abs?: number | null;
    readonly title?: string | null;
    readonly images?: { readonly screenshot?: readonly string[] | null } | null;
  } | null;
  readonly list?: {
    readonly name: string;
    readonly privacy?: string | null;
    readonly ids: { readonly trakt: number; readonly slug?: string | null };
    readonly user?: { readonly ids: { readonly slug?: string | null } } | null;
    readonly images?: { readonly posters?: readonly string[] | null } | null;
  } | null;
};
