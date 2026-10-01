import { error } from '@sveltejs/kit';
import type { CommentResponse } from '@trakt/api';
import { api } from '../api/api.ts';
import { extractPageMeta } from '../api/extractPageMeta.ts';
import { loadSubpageMedia } from '../subpage/loadSubpageMedia.ts';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { type ItemCommentSort, itemCommentSort } from './itemCommentSort.ts';

type Params = Omit<Parameters<typeof loadSubpageMedia>[0], 'suffix'> & {
  url: URL;
  /** The optional `/:sort_by` segment. */
  sortBy: string | undefined;
};

// OG's `@per`.
const LIMIT = 100;

async function readComments(fetch: typeof globalThis.fetch, item: SubpageItem, sort: ItemCommentSort, page: number) {
  const client = api({ fetch });
  const request = {
    params: { id: item.id, sort: sort.api },
    query: { extended: 'images', page, limit: LIMIT },
  } as const;
  const response = item.type === 'movie'
    ? await client.movies.comments(request)
    : item.type === 'show'
    ? await client.shows.comments(request)
    : item.type === 'season'
    ? await client.shows.season.comments({ ...request, params: { ...request.params, season: Number(item.season) } })
    : await client.shows.episode.comments({
      ...request,
      params: { ...request.params, season: Number(item.season), episode: Number(item.episode) },
    });
  // The item's own 404 comes from the summary read.
  if (response.status === 404) return { comments: [] as readonly CommentResponse[], count: 0, page: null };
  if (response.status !== 200) error(502, 'The Trakt API could not load the comments.');
  const meta = extractPageMeta(response.headers, page);
  return {
    comments: response.body,
    count: Number(response.headers.get('x-pagination-item-count') ?? response.body.length),
    page: meta.type === 'paginated' ? meta : null,
  };
}

/**
 * `/movies/:id/comments(/:sort_by)`, `/shows/:id/comments(/:sort_by)` and the season and episode ones: 100 comments a page under the subpage frame. The read is public, so blocked members
 * aren't filtered yet.
 */
export async function loadItemComments({ fetch, parent, item, url, sortBy }: Params) {
  const sort = itemCommentSort(sortBy, url.searchParams.get('sort_how'));
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1);
  const [subpage, comments] = await Promise.all([
    loadSubpageMedia({ fetch, parent, item, suffix: 'comments' }),
    readComments(fetch, item, sort, page),
  ]);
  return { ...subpage, ...comments, sort };
}
