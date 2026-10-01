import { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { loadHiddenShows } from '../../overlay/loadHiddenShows.ts';
import type { ProgressTotals } from './ProgressTotals.ts';
import { type ProgressRowData, progressRowsSchema } from './progressRowsSchema.ts';
import { progressTotalsSchema } from './progressTotalsSchema.ts';
import { sumProgressTotals } from './sumProgressTotals.ts';

type FetchDroppedProgressParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  /** `/users/:id/progress/watched/:sort_by/:sort_how`, the worker's sort for the tab's. */
  path: string;
  /** The page's filters, so the tab narrows the same list Watched shows. */
  filters: Record<string, string>;
  page: number;
  limit: number;
};

type DroppedProgress = {
  /** This page's shows, in the sort's order. */
  readonly rows: readonly ProgressRowData[];
  /** When each of them was dropped, by show id. */
  readonly droppedAt: ReadonlyMap<number, string>;
  /** Dropped shows across every page. */
  readonly total: number;
  readonly pageCount: number;
  readonly totals: ProgressTotals;
};

// The worker's page cap. Twenty pages is 5,000 watched shows, to keep the read inside a Worker's subrequests.
const LIMIT = 250;
const MAX_PAGES = 20;

const lightRowsSchema = z.array(progressTotalsSchema.element.extend({
  show: z.object({ ids: z.object({ trakt: z.number() }) }),
}));

class Unauthorized extends Error {}

const NONE: DroppedProgress = {
  rows: [],
  droppedAt: new Map(),
  total: 0,
  pageCount: 1,
  totals: sumProgressTotals([]),
};

async function read<T>(params: FetchDroppedProgressParams, query: Record<string, string>, schema: z.ZodType<T>) {
  const search = new URLSearchParams({ ...params.filters, ...query, limit: String(LIMIT) });
  const response = await rawApiFetch({ fetch: params.fetch, token: params.token, path: `${params.path}?${search}` });
  if (response.status === 401) throw new Unauthorized();
  if (response.status !== 200) throw new Error(`dropped progress: ${response.status}`);
  return {
    rows: schema.parse(await response.json()),
    pages: Number.parseInt(response.headers.get('x-pagination-page-count') ?? '1', 10) || 1,
  };
}

/** Every watched show in the sort's order, counts only, from as many 250-show pages as there are. */
async function readOrder(params: FetchDroppedProgressParams) {
  const first = await read(params, { page: '1' }, lightRowsSchema);
  const pages = Math.min(first.pages, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => read(params, { page: String(i + 2) }, lightRowsSchema)),
  );
  return [first, ...rest].flatMap(({ rows }) => rows);
}

/** The full rows (seasons, images) of the 250-show pages holding these positions, by show id. */
async function readRows(params: FetchDroppedProgressParams, positions: readonly number[]) {
  const pages = [...new Set(positions.map((position) => Math.floor(position / LIMIT) + 1))];
  const results = await Promise.all(
    pages.map((page) =>
      read(params, { include_seasons: 'true', extended: 'full,images', page: String(page) }, progressRowsSchema)
    ),
  );
  return new Map(results.flatMap(({ rows }) => rows.map((row) => [row.show.ids.trakt, row] as const)));
}

/**
 * The Dropped tab. The progress route has no dropped filter, so og
 * reads your dropped shows from `/users/hidden/dropped` (P), walks the watched progress in the tab's sort to keep
 * only those, and then reads the full rows for this page's. The worker's sorts break ties on the show id, so both
 * walks see the same order. Resolves `null` when the token stopped working.
 */
export async function fetchDroppedProgress(params: FetchDroppedProgressParams): Promise<DroppedProgress | null> {
  const get = async (path: string) => {
    const response = await rawApiFetch({ fetch: params.fetch, token: params.token, path });
    if (response.status === 401) throw new Unauthorized();
    return response;
  };

  try {
    const [droppedAt, watched] = await Promise.all([loadHiddenShows(get, 'dropped'), readOrder(params)]);
    // OG listed every watched show with nothing dropped (`show_ids = []` reads as no filter). og shows it empty.
    if (droppedAt.size === 0) return NONE;

    const order = watched.flatMap((row, position) => droppedAt.has(row.show.ids.trakt) ? [{ row, position }] : []);
    const onPage = order.slice((params.page - 1) * params.limit, params.page * params.limit);
    const full = await readRows(params, onPage.map(({ position }) => position));

    return {
      rows: onPage.flatMap(({ row }) => full.get(row.show.ids.trakt) ?? []),
      droppedAt,
      total: order.length,
      pageCount: Math.max(Math.ceil(order.length / params.limit), 1),
      totals: sumProgressTotals(order.map(({ row }) => row)),
    };
  } catch (cause) {
    if (cause instanceof Unauthorized) return null;
    throw cause;
  }
}
