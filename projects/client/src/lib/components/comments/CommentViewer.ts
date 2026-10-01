/** The signed-in member reading the comments. `null` is logged out. */
export type CommentViewer = {
  readonly slug: string;
  /** Members banned from commenting lose report, edit, delete and reply. */
  readonly commentingBanned?: boolean;
} | null;
