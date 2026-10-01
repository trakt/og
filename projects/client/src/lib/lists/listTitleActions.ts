import type { ListView } from './toListView.ts';

/** An icon in the title row. Left without `onclick`, it renders as OG's but is marked unavailable until wired. */
type TitleAction = { readonly onclick?: () => void };

/** The icons on the right of a list page's title row, each set one shown. */
export interface ListTitleActions {
  readonly report?: TitleAction;
  readonly edit?: TitleAction;
  readonly delete?: TitleAction;
  readonly leave?: TitleAction;
  /** Owner or collaborator: "Manage". */
  readonly manage?: TitleAction;
  /** Everyone else: "Copy". */
  readonly copy?: TitleAction;
  /** Left out on official lists. */
  readonly progressHref?: string;
  readonly shareUrl: string;
}

type ListTitleActionsParams = {
  list: Pick<ListView, 'id' | 'kind' | 'ownerSlug' | 'href'>;
  viewer: { readonly slug: string; readonly isVip: boolean } | null;
  isCollaborator: boolean;
  /** og's origin, for the share URL. */
  origin: string;
};

/**
 * Which title row icons the viewer gets: the report flag when signed in, the owner's edit and (personal lists only)
 * delete, a collaborator's "Stop collaborating", share, Manage for whoever can manage and Copy for everyone else, and
 * Progress off official lists. Report and leave are wired; edit/delete/manage/copy remain unimplemented. Subscribe is
 * cut.
 */
export function listTitleActions({ list, viewer, isCollaborator, origin }: ListTitleActionsParams): ListTitleActions {
  const owner = list.kind !== 'official' && viewer?.slug === list.ownerSlug;
  const collaborator = list.kind !== 'official' && !owner && isCollaborator;
  const progressHref = viewer?.isVip && list.id > 0
    ? `/users/${viewer.slug}/progress?list=${list.id}`
    : '/vip/list-progress';

  return {
    ...(viewer && { report: {} }),
    ...(owner && { edit: {} }),
    ...(owner && list.kind === 'personal' && { delete: {} }),
    ...(collaborator && { leave: {} }),
    ...(owner || collaborator ? { manage: {} } : { copy: {} }),
    ...(list.kind !== 'official' && { progressHref }),
    shareUrl: `${origin}${list.href}`,
  };
}
