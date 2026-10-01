/**
 * OG dropped blocked members' comments on the server for item comments, previews and replies
 * The worker doesn't, so og drops them here.
 */
export function withoutBlocked<T extends { readonly user: { readonly ids: { readonly trakt: number } } }>(
  comments: readonly T[],
  blocked: ReadonlySet<number>,
): readonly T[] {
  return blocked.size === 0 ? comments : comments.filter(({ user }) => !blocked.has(user.ids.trakt));
}
