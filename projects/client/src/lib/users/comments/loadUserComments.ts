import type { CommentResponse } from '@trakt/api';
import { error } from '@sveltejs/kit';
import { api } from '../../api/api.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { likedCommentRowsSchema } from './likedCommentRowsSchema.ts';
import { toUserComment } from './toUserComment.ts';
import type { UserComment } from './UserComment.ts';
import type { UserCommentRow } from './UserCommentRow.ts';
import type { userCommentMediaTypes } from './userCommentMediaTypes.ts';
import type { userCommentTypes } from './userCommentTypes.ts';

type CommentType = keyof typeof userCommentTypes;
type MediaType = keyof typeof userCommentMediaTypes;

type Params = {
  fetch: typeof globalThis.fetch;
  parent: () => Promise<{ profile: ProfileUser }>;
  locals: { token: string | null };
  params: { id: string; comment_type?: CommentType; type?: MediaType };
  url: URL;
  /** `/users/:id/comments/liked`: the comments the member liked, not the ones they wrote. */
  liked?: boolean;
};

/** One row of the page: the comment beside its poster, and for a reply the comment it answers. */
export type UserCommentEntry = { readonly row: UserComment; readonly parent?: CommentResponse };

/** OG's `.per(params[:limit] || 30)`. */
const PAGE_SIZE = 30;

const pageNumber = (value: string | null) => Math.max(1, Number.parseInt(value ?? '', 10) || 1);

type Listing =
  | { readonly status: 'ok'; readonly rows: readonly UserCommentRow[]; readonly headers: Headers }
  | { readonly status: 'empty' };

type Request = { fetch: typeof globalThis.fetch; token: string | null; id: string; page: number; limit: number };

// Native. The worker answers an empty page for a private profile the token can't see.
async function fetchWritten(
  { fetch, token, id, page, limit, commentType, type }: Request & { commentType: CommentType; type: MediaType },
): Promise<Listing> {
  const response = await api({ fetch, token }).users.comments({
    params: { id, comment_type: commentType === 'replies' ? 'all' : commentType, type },
    query: {
      extended: 'full,images',
      page,
      limit,
      ...(commentType === 'replies' ? { include_replies: 'only' as const } : {}),
    },
  });
  // A stale cookie on a private profile renders it empty until the browser renews. The server never refreshes.
  if (response.status === 401) return { status: 'empty' };
  if (response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading these comments.');
  // The worker sends list comments too, which the contract doesn't type.
  const rows: readonly UserCommentRow[] = response.body;
  return { status: 'ok', rows, headers: response.headers };
}

// API. It answers 500 without a signed-in viewer (its cache key reads `current_user.id`), so it always sends one.
async function fetchLiked({ fetch, token, id, page, limit }: Request): Promise<Listing> {
  if (!token) return { status: 'empty' };
  const query = new URLSearchParams({ extended: 'comments,full,images', page: String(page), limit: String(limit) });
  const response = await rawApiFetch({
    fetch,
    token,
    path: `/users/${encodeURIComponent(id)}/likes/comments?${query}`,
  });
  if (response.status === 401 || response.status === 403) return { status: 'empty' };
  if (response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading these liked comments.');
  const rows = likedCommentRowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) error(502, 'Trakt returned invalid liked comments.');
  return { status: 'ok', rows: rows.data, headers: response.headers };
}

// A reply shows the comment it answers. Each parent is one public `/comments/:id` read; a missing one is left out.
async function fetchParents(fetch: typeof globalThis.fetch, comments: readonly UserComment[]) {
  const ids = [...new Set(comments.map(({ comment }) => comment.parent_id).filter((id) => id > 0))];
  const client = api({ fetch });
  const parents = await Promise.all(ids.map(async (id) => {
    const response = await client.comments.summary({ params: { id: String(id) } }).catch(() => null);
    return response?.status === 200 && response.body.user ? response.body : null;
  }));
  return new Map(parents.flatMap((parent) => parent ? [[parent.id, parent] as const] : []));
}

/**
 * `/users/:id/comments(/:comment_type)(/:type)` and `/users/:id/comments/liked`: 30 comments a page, newest first, each beside its item's poster. A member's own comments are
 * public reads, sent with the token only for a private profile the frame already let the viewer see.
 */
export async function loadUserComments({ fetch, parent, locals, params, url, liked = false }: Params) {
  const commentType = liked ? 'all' : params.comment_type ?? 'all';
  const type = liked ? 'all' : params.type ?? 'all';
  const current = pageNumber(url.searchParams.get('page'));
  const limit = Math.min(100, pageNumber(url.searchParams.get('limit') ?? String(PAGE_SIZE)));
  const listing = (token: string | null) => {
    const request = { fetch, token, id: params.id, page: current, limit };
    return liked ? fetchLiked(request) : fetchWritten({ ...request, commentType, type });
  };

  const [initial, { profile }] = await Promise.all([listing(liked ? locals.token : null), parent()]);
  const empty = {
    liked,
    commentType,
    type,
    entries: [] as UserCommentEntry[],
    itemCount: 0,
    page: extractPageMeta(new Headers(), current),
  };
  if (profile.isLocked) return empty;

  const result = !liked && profile.isPrivate && locals.token ? await listing(locals.token) : initial;
  if (result.status === 'empty') return empty;

  const comments = result.rows.flatMap((row) => toUserComment(row) ?? []);
  const parents = await fetchParents(fetch, comments);
  return {
    ...empty,
    entries: comments.map((row): UserCommentEntry => ({ row, parent: parents.get(row.comment.parent_id) })),
    itemCount: Number(result.headers.get('x-pagination-item-count') ?? result.rows.length),
    page: extractPageMeta(result.headers, current),
  };
}
