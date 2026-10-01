import type { CommentInline } from './CommentInline.ts';

/** One block of a comment: what Redcarpet rendered as a `<p>`, `<h1>`, `<blockquote>`, list, code block or rule. */
export type CommentBlock =
  /** `author` is the `~1` to `~6` author style. */
  | { readonly type: 'paragraph'; readonly author?: number; readonly children: readonly CommentInline[] }
  | { readonly type: 'heading'; readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly children: readonly CommentInline[] }
  | { readonly type: 'quote'; readonly children: readonly CommentBlock[] }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: readonly (readonly CommentInline[])[] }
  | { readonly type: 'code'; readonly text: string }
  | { readonly type: 'rule' };
