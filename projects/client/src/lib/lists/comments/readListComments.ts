import { error } from '@sveltejs/kit';
import type { api } from '../../api/api.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import type { ListCommentsQuery } from './toListCommentsQuery.ts';

type Client = ReturnType<typeof api>;

/** Every list comments read answers the same way: a page of top-level comments. */
export type ListCommentsResponse =
  | Awaited<ReturnType<Client['lists']['comments']>>
  | Awaited<ReturnType<Client['users']['lists']['list']['comments']>>
  | Awaited<ReturnType<Client['users']['watchlist']['comments']>>
  | Awaited<ReturnType<Client['users']['favorites']['comments']>>;

type ReadParams = {
  response: ListCommentsResponse;
  query: ListCommentsQuery;
};

/** No comments: a locked profile, or a private list on a stale token. */
export const emptyListComments = (query: ListCommentsQuery) => ({
  comments: [],
  itemCount: 0,
  listId: null,
  page: extractPageMeta(new Headers(), query.page),
});

/**
 * One page of a list's comments. `X-List-ID` is the list's Trakt id, the one read that has it for a watchlist or
 * favorites.
 */
export function readListComments({ response, query }: ReadParams) {
  // The server never refreshes: a stale token renders no private comments until the browser renews.
  if (response.status === 401) return emptyListComments(query);
  if (response.status === 403 || response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading these comments.');
  const id = Number(response.headers.get('x-list-id'));
  return {
    comments: response.body,
    itemCount: Number(response.headers.get('x-pagination-item-count') ?? response.body.length),
    listId: id > 0 ? id : null,
    page: extractPageMeta(response.headers, query.page),
  };
}
