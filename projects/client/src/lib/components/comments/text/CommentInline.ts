/** One piece of a comment's inline text. The renderer turns each into a Svelte element or a text node, never HTML. */
export type CommentInline =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'break' }
  | { readonly type: 'strong' | 'em' | 'del' | 'mark'; readonly children: readonly CommentInline[] }
  | { readonly type: 'code'; readonly text: string }
  /** An allowlisted URL. `video` is a YouTube id, which OG opened in a popup. */
  | {
    readonly type: 'link';
    readonly href: string;
    readonly video?: string;
    readonly children: readonly CommentInline[];
  }
  | { readonly type: 'mention'; readonly username: string }
  | { readonly type: 'emoji'; readonly emoji: string; readonly shortname: string }
  | { readonly type: 'spoiler'; readonly children: readonly CommentInline[] };
