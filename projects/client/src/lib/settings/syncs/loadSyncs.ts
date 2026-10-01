import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import type { DatePreferences } from '../DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { readSyncs } from './readSyncs.ts';
import { syncSchema } from './syncSchema.ts';
import { syncSources } from './syncSources.ts';
import { toSyncRow } from './toSyncRow.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  parent: () => Promise<{ datePreferences: DatePreferences }>;
  url: URL;
};

/** The Data tab lists imports, five a page; All Data Imports & Syncs lists every sync, 30 a page. */
const SCOPES = {
  import: { path: '/import', limit: 5 },
  all: { path: '', limit: 30 },
} as const;

const syncsSchema = z.array(syncSchema);

const pageOf = (url: URL) => Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1);

const header = (headers: Headers, name: string) => Math.max(0, Number.parseInt(headers.get(name) ?? '', 10) || 0);

/**
 * The viewer's syncs for `/settings/data` and `/settings/syncs`, with OG's notice: how many there are and when the
 * newest ran. API sends the page count and total but not the current page, so the page comes from the URL.
 */
export async function loadSyncs({ fetch, locals, parent, url }: Params, scope: keyof typeof SCOPES) {
  const token = locals.token;
  if (!token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);

  const { path, limit } = SCOPES[scope];
  const page = pageOf(url);
  const read = (at: number, size: number) =>
    readSyncs({ fetch, token, path: `${path}?page=${at}&limit=${size}`, schema: syncsSchema });

  const [syncs, newest, sources, { datePreferences }] = await Promise.all([
    read(page, limit),
    // OG dated its notice from the page's first row; the newest sync is page 1's.
    page > 1 ? read(1, 1) : null,
    syncSources(fetch),
    parent(),
  ]);
  if (syncs.status === 'expired' || newest?.status === 'expired') return { expired: true as const };
  if (syncs.status === 'missing') error(502, 'Trakt is having trouble loading your data syncs.');

  const latest = (newest?.status === 'ok' ? newest.data : syncs.data).at(0);
  return {
    expired: false as const,
    rows: syncs.data.map((sync) => toSyncRow({ sync, sources, datePreferences })),
    count: header(syncs.headers, 'x-pagination-item-count'),
    latest: latest ? formatDate(latest.created_at, { ...datePreferences, time: true }) : null,
    page: { current: page, total: Math.max(1, header(syncs.headers, 'x-pagination-page-count')) },
  };
}
