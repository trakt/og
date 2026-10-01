import { error } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { extractPageMeta } from '../api/extractPageMeta.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { loadPersonSubpage } from '../subpage/loadPersonSubpage.ts';
import { loadSubpageMedia } from '../subpage/loadSubpageMedia.ts';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { summaryListSchema } from '../summary/summaryListSchema.ts';
import { type SummaryList, toSummaryList } from '../summary/toSummaryList.ts';
import { type ItemListQuery, itemListQuery, itemListSorts, itemListTypes } from './itemListQuery.ts';

/** The item a lists page is under: a media subpage item, or a person. */
export type ItemListsItem = SubpageItem | { readonly type: 'person'; readonly id: string };

type Params = Omit<Parameters<typeof loadSubpageMedia>[0], 'suffix' | 'item'> & {
  item: ItemListsItem;
  url: URL;
  /** The optional `/:type` and `/:sort_by` segments. */
  type: string | undefined;
  sortBy: string | undefined;
};

// OG's `per_page`.
const LIMIT = 30;

// @trakt/api 0.6.0 types the list types as `watchlist|favorites`, but the worker takes `watchlists|recommendations`
// (and quietly serves personal lists for anything else), so og calls the route raw and parses it.
const listsSchema = z.array(summaryListSchema);

const itemPath = (item: ItemListsItem): string => {
  const id = encodeURIComponent(item.id);
  if (item.type === 'movie') return `/movies/${id}`;
  if (item.type === 'person') return `/people/${id}`;
  if (item.type === 'show') return `/shows/${id}`;
  const season = `/shows/${id}/seasons/${encodeURIComponent(item.season)}`;
  return item.type === 'season' ? season : `${season}/episodes/${encodeURIComponent(item.episode)}`;
};

async function readLists(fetch: typeof globalThis.fetch, item: ItemListsItem, query: ItemListQuery, page: number) {
  const { api: type } = itemListTypes[query.type];
  const { api: sort } = itemListSorts[query.sortBy];
  const search = new URLSearchParams({ extended: 'images', page: String(page), limit: String(LIMIT) });
  const response = await rawApiFetch({ fetch, path: `${itemPath(item)}/lists/${type}/${sort}?${search}` });
  // The item's own 404 comes from the summary read.
  if (response.status === 404) return { lists: [] as readonly SummaryList[], count: 0, page: null };
  if (!response.ok) error(502, 'The Trakt API could not load the lists.');
  const lists = listsSchema.safeParse(await response.json().catch(() => null));
  if (!lists.success) error(502, 'The Trakt API returned invalid lists data.');
  const meta = extractPageMeta(response.headers, page);
  return {
    lists: lists.data.map(toSummaryList),
    count: Number(response.headers.get('x-pagination-item-count') ?? lists.data.length),
    page: meta.type === 'paginated' ? meta : null,
  };
}

/**
 * `/movies/:id/lists(/:type)(/:sort_by)`, the show, season, episode and person ones: 30 public lists a page under the subpage frame. The worker leaves out clones.
 */
export async function loadItemLists({ fetch, parent, item, url, type, sortBy }: Params) {
  const query = itemListQuery(type, sortBy);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1);
  const [subpage, lists] = await Promise.all([
    item.type === 'person'
      ? loadPersonSubpage({ fetch, parent, id: item.id, suffix: 'lists' })
      : loadSubpageMedia({ fetch, parent, item, suffix: 'lists' }),
    readLists(fetch, item, query, page),
  ]);
  return { ...subpage, ...lists, kind: item.type, query };
}
