import type { ListRowActions } from '../../components/media/ListRowActions.ts';
import type { UserListRow } from './UserListRow.ts';

type ListRowActionsParams = {
  row: UserListRow;
  /** The signed-in viewer, or null. */
  viewer: { readonly slug: string; readonly isVip: boolean } | null;
  /** The viewer is an approved collaborator on the list. */
  isCollaborator: boolean;
  /** og's origin, for the share URL. */
  origin: string;
};

/**
 * Which icons a list row shows the viewer: the report flag when signed in, the owner's
 * edit and (personal lists only) delete, a collaborator's "Stop collaborating", progress (not on official lists), and
 * share. Report and leave are wired; edit and delete remain unimplemented.
 * The watchlist and favorites resolve their numeric list id from their comments on click.
 */
export function listRowActions({ row, viewer, isCollaborator, origin }: ListRowActionsParams): ListRowActions {
  const owner = viewer?.slug === row.owner.slug;
  const progressHref = viewer?.isVip ? `/users/${viewer.slug}/progress?list=${row.id}` : '/vip/list-progress';

  return {
    ...(viewer && { report: {} }),
    ...(owner && row.kind !== 'official' && { edit: {} }),
    ...(owner && row.kind === 'personal' && { delete: {} }),
    ...(!owner && isCollaborator && { leave: {} }),
    ...(row.kind !== 'official' && (row.id !== null || !viewer?.isVip ? { progressHref } : { progress: {} })),
    shareUrl: `${origin}${row.href}`,
  };
}
