import type { ListResponse } from '@trakt/api';
import { imageUrl } from '../../utils/imageUrl.ts';
import { listPath } from '../listPath.ts';
import type { ListCommentsTarget } from './ListCommentsTarget.ts';

type ListSource =
  & Pick<ListResponse, 'name' | 'description' | 'type' | 'allow_comments' | 'ids' | 'images'>
  & { readonly user: { readonly username: string; readonly ids: { readonly slug?: string | null } } };

/** A personal or official list's summary (`extended=images`) as its comments page's subject. */
export function toListCommentsTarget(list: ListSource): ListCommentsTarget {
  return {
    title: list.name,
    fullTitle: list.name,
    ...(list.description?.trim() && { description: list.description.trim() }),
    href: listPath(list),
    id: list.ids.trakt,
    allowComments: list.allow_comments,
    posters: (list.images?.posters ?? []).slice(0, 4).map((path) => ({ image: imageUrl(path, 'thumb') })),
  };
}
