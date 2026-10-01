import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { type ProgressRowData, progressRowsSchema } from './progressRowsSchema.ts';
import { progressTypes } from './progressTypes.ts';

type FetchProgressRowParams = {
  /** The authenticated fetch: it renews a spent token and retries once. */
  fetch: typeof globalThis.fetch;
  /** The profile's slug. Only your own rows reload, so it's the viewer's. */
  slug: string;
  type: 'watched' | 'library';
  show: { readonly id: number; readonly title: string };
  /** Your "Calculate Up Next Using" setting, the worker's `last_activity`, as the page read it. */
  lastActivity?: 'watched' | 'collected';
};

// The worker's page cap, so a short title that many shows contain still finds this one.
const LIMIT = 250;

/**
 * One show's progress row again, after a watch, a collect or a rewatch (OG's `refreshProgressItem`, `global.js:2116`).
 * The progress route has no show filter, so this narrows the same read to the show's title (`terms` matches it) and
 * picks the show out, which keeps the row's shape, seasons and the viewer's specials setting identical to the page's.
 * Your own progress is never cached by the worker. Rejects when the read fails or the show isn't in it.
 */
export async function fetchProgressRow(
  { fetch, slug, type, show, lastActivity }: FetchProgressRowParams,
): Promise<ProgressRowData> {
  const query = new URLSearchParams({
    terms: show.title,
    include_seasons: 'true',
    extended: 'full,images',
    limit: String(LIMIT),
    ...(lastActivity && { last_activity: lastActivity }),
  });
  const path = `/users/${encodeURIComponent(slug)}/progress/${progressTypes[type].api}?${query}`;
  const response = await rawApiFetch({ fetch, path });
  if (response.status !== 200) throw new Error(`progress row: ${response.status}`);

  const rows = progressRowsSchema.parse(await response.json());
  const row = rows.find((candidate) => candidate.show.ids.trakt === show.id);
  if (!row) throw new Error('progress row: show not found');
  return row;
}
