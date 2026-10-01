import type { CommentResponse, ReactionsSummaryResponse } from '@trakt/api';
import { z } from 'zod/v4';
import { api } from '../../api/api.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { commentWrite, type PostCommentResult } from './postComment.ts';

type Api = ReturnType<typeof api>;

// 100 a page, the worker's default. Ten pages is more replies than any thread OG showed inline.
const REPLIES_PAGE = 100;
const MAX_REPLY_PAGES = 10;

// No contract: API's hide response counts what it hid.
const FAILED = 'Doh! We ran into some sort of error.';
const hiddenSchema = z.object({ added: z.object({ users: z.number() }) });

export type CommentsClient = {
  /** Every reply to a comment, oldest first. Rejects when the first page fails. */
  replies: (id: number) => Promise<readonly CommentResponse[]>;
  /** The reaction totals, or `undefined` when the request fails: the card just leaves the summary out. */
  reactionSummary: (id: number, fresh?: boolean) => Promise<ReactionsSummaryResponse | undefined>;
  /**
   * `POST /comments/:id/replies`. API moves a reply to a
   * reply up to its top-level comment, but the contract says 404, so send the top-level id.
   */
  reply: (id: number, comment: string) => Promise<PostCommentResult>;
  /** `PUT /comments/:id`: 200 with the saved comment. */
  edit: (id: number, body: { comment: string; spoiler: boolean }) => Promise<PostCommentResult>;
  /** `DELETE /comments/:id`: 204, or an empty 409. */
  remove: (id: number) => Promise<PostCommentResult>;
  /** `POST /users/hidden/comments` (API, no contract): hides every comment by the member. */
  block: (slug: string) => Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }>;
};

/**
 * The comment card's calls after the page loads: inline replies, reaction summary, replying, editing, deleting and
 * blocking. `fetch` is for the routes `client` has no contract for.
 */
export function commentsClient(client: Api, fetch: typeof globalThis.fetch = globalThis.fetch): CommentsClient {
  const repliesFrom = async (id: number, page: number): Promise<readonly CommentResponse[]> => {
    const response = await client.comments.replies({
      params: { id: String(id) },
      query: { extended: 'images', page, limit: REPLIES_PAGE },
    });
    if (response.status !== 200) throw new Error(`/comments/${id}/replies returned ${response.status}`);

    const meta = extractPageMeta(response.headers, page);
    const more = meta.type === 'paginated' && meta.current < meta.total && page < MAX_REPLY_PAGES;
    if (!more) return response.body;
    return [...response.body, ...await repliesFrom(id, page + 1).catch(() => [])];
  };

  return {
    replies: (id) => repliesFrom(id, 1),
    reactionSummary: async (id) => {
      const response = await client.comments.reactions.summary({ params: { id: String(id) } }).catch(() => null);
      return response?.status === 200 ? response.body : undefined;
    },
    reply: (id, comment) =>
      commentWrite(client.comments.reply({ params: { id: String(id) }, body: { comment, spoiler: false } }), 201),
    edit: (id, body) => commentWrite(client.comments.edit({ params: { id: String(id) }, body }), 200),
    remove: (id) => commentWrite(client.comments.delete({ params: { id: String(id) } }), 204),
    block: async (slug) => {
      try {
        const response = await rawApiFetch({
          fetch,
          path: '/users/hidden/comments',
          init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: [{ ids: { slug } }] }),
          },
        });
        if (response.status !== 201) return { ok: false, message: FAILED };
        return hiddenSchema.parse(await response.json()).added.users > 0
          ? { ok: true }
          : { ok: false, message: FAILED };
      } catch {
        return { ok: false, message: FAILED };
      }
    },
  };
}
