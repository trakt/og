import { type CommentResponse, commentResponseSchema } from '@trakt/api';
import { z } from 'zod/v4';
import { api } from '../../api/api.ts';
import { contractSchema } from '../../api/contractSchema.ts';
import type { CommentItem } from './CommentItem.ts';

type PostCommentParams = {
  /** `authenticatedFetch` in the browser. */
  fetch: typeof fetch;
  item: Pick<CommentItem, 'type' | 'id'>;
  comment: string;
  spoiler: boolean;
};

export type PostCommentResult =
  /** `comment` is null when the 201's body is off-contract: it posted, so the form still clears. */
  | { readonly ok: true; readonly comment: CommentResponse | null }
  | { readonly ok: false; readonly message: string };

// `comments.js` `parseCommentError`.
const RATE_LIMITED = 'ERROR 429: Whoa there, Lightning McQueen! Please try again in a few seconds.';
const UNKNOWN = 'There was an unknown error or the request timed out. Please try again later.';

// API: 422 is `{ errors: { comment: ['must be at least 5 words'] } }`, a closed list's 404 `{ message }`.
const errorSchema = z.union([
  z.object({ errors: z.record(z.string(), z.array(z.string())) }),
  z.object({ message: z.string() }),
]);
const createdSchema = contractSchema<CommentResponse>(commentResponseSchema);

/** API's validation messages for the first error, with OG's full stop: "Comment must be at least 5 words." */
export function commentError(status: number, body: unknown): string {
  if (status === 429) return RATE_LIMITED;
  const parsed = errorSchema.safeParse(body);
  if (!parsed.success) return UNKNOWN;
  if ('message' in parsed.data) return parsed.data.message.replace(/\.?$/, '.');

  const [field, messages] = Object.entries(parsed.data.errors)[0] ?? [];
  if (!field || !messages?.[0]) return UNKNOWN;
  const name = field.replaceAll('_', ' ');
  return `${name[0]?.toUpperCase()}${name.slice(1)} ${messages[0]}.`;
}

/** A comment write's outcome: the expected status with the saved comment, or OG's error message. */
export async function commentWrite(
  request: Promise<{ status: number; body: unknown }>,
  success: number,
): Promise<PostCommentResult> {
  try {
    const response = await request;
    if (response.status !== success) return { ok: false, message: commentError(response.status, response.body) };
    const parsed = createdSchema.safeParse(response.body);
    return { ok: true, comment: parsed.success ? parsed.data : null };
  } catch {
    return { ok: false, message: UNKNOWN };
  }
}

/**
 * `POST /comments`. It skips the web form's English check but
 * keeps the 5-word minimum. No `sharing`: the X, Mastodon and Tumblr integrations are gone.
 */
export function postComment({ fetch, item, comment, spoiler }: PostCommentParams): Promise<PostCommentResult> {
  return commentWrite(
    api({ fetch }).comments.post({ body: { [item.type]: { ids: { trakt: item.id } }, comment, spoiler } }),
    201,
  );
}
