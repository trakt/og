import type { ViewerRelation } from './ViewerRelation.ts';

type UserRow = { readonly user: { readonly ids: { readonly slug?: string | null } } };
type RequestRow = UserRow & { readonly id: number };

export interface ViewerLists {
  readonly following: readonly UserRow[];
  /** `GET /users/requests/following`: the viewer's follows waiting for approval. */
  readonly pending: readonly UserRow[];
  readonly followers: readonly UserRow[];
  readonly blocked: readonly UserRow[];
  /** `GET /users/requests`: people waiting for the viewer to approve them. */
  readonly requests: readonly RequestRow[];
}

/** The viewer's relation to `slug`, from the viewer's own network lists. */
export function toViewerRelation(slug: string, lists: ViewerLists): ViewerRelation {
  const is = (row: UserRow) => row.user.ids.slug === slug;

  return {
    follow: lists.following.some(is) ? 'following' : lists.pending.some(is) ? 'pending' : 'none',
    followsYou: lists.followers.some(is),
    blocked: lists.blocked.some(is),
    requestId: lists.requests.find(is)?.id ?? null,
  };
}
