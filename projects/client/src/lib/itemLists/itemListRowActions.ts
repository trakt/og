import type { ListRowActions } from '../components/media/ListRowActions.ts';
import type { SummaryList } from '../summary/toSummaryList.ts';

type Params = {
  list: SummaryList;
  /** The signed-in viewer, or null. */
  viewer: { readonly slug: string; readonly isVip: boolean } | null;
  /** og's origin, for the share URL. */
  origin: string;
};

/**
 * The icons a row on an item's lists page shows: the report flag when signed in,
 * the owner's edit and (personal lists only) delete, progress (not on official lists) and share. Report, edit and
 * delete are wired by their own issues; until then they're inert. The calendar icon is cut, and the
 * collaborator's "Stop collaborating" needs a collaborators read per row, which this page leaves out.
 */
export function itemListRowActions({ list, viewer, origin }: Params): ListRowActions {
  const owner = viewer !== null && viewer.slug === list.owner.slug;
  const progressHref = viewer?.isVip ? `/users/${viewer.slug}/progress?list=${list.id}` : '/vip/list-progress';

  return {
    ...(viewer && { report: {} }),
    ...(owner && list.kind !== 'official' && { edit: {} }),
    ...(owner && list.kind === 'personal' && { delete: {} }),
    ...(list.kind !== 'official' && { progressHref }),
    shareUrl: `${origin}${list.href}`,
  };
}
