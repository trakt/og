import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import type { DatePreferences } from '../DatePreferences.ts';
import { readSyncs } from './readSyncs.ts';
import { syncItemSchema } from './syncItemSchema.ts';
import { syncSchema } from './syncSchema.ts';
import { syncSources } from './syncSources.ts';
import { toSyncItemTable } from './toSyncItemTable.ts';
import { toSyncRow } from './toSyncRow.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  parent: () => Promise<{ datePreferences: DatePreferences }>;
  params: { id: string };
  url: URL;
};

/** OG's ten items a page, one `page` for both lists. */
const LIMIT = 10;

const itemsSchema = z.array(syncItemSchema);

const header = (headers: Headers, name: string) => Math.max(0, Number.parseInt(headers.get(name) ?? '', 10) || 0);

/**
 * `/settings/syncs/:id`: the sync's row, then a page of its paused and its skipped items. Someone else's sync
 * is a 404, like OG. Only Younify and Plex syncs keep paused or skipped items; an importer's lists come back empty.
 */
export async function loadSyncDetails({ fetch, locals, parent, params, url }: Params) {
  const token = locals.token;
  if (!token) redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);

  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1);
  const items = (list: 'paused' | 'skipped') =>
    readSyncs({ fetch, token, path: `/${params.id}/${list}?page=${page}&limit=${LIMIT}`, schema: itemsSchema });

  const [sync, paused, skipped, sources, { datePreferences }] = await Promise.all([
    readSyncs({ fetch, token, path: `/${params.id}`, schema: syncSchema }),
    items('paused'),
    items('skipped'),
    syncSources(fetch),
    parent(),
  ]);
  if ([sync, paused, skipped].some((read) => read.status === 'expired')) return { expired: true as const };
  if (sync.status !== 'ok' || paused.status !== 'ok' || skipped.status !== 'ok') error(404, 'Page Not Found');

  const layout = sync.data.kind === 'plex' ? 'plex' : 'younify';
  const section = (read: typeof paused & { status: 'ok' }) => ({
    count: header(read.headers, 'x-pagination-item-count'),
    page: { current: page, total: Math.max(1, header(read.headers, 'x-pagination-page-count')) },
    table: toSyncItemTable({ items: read.data, layout, sources, datePreferences }),
  });

  return {
    expired: false as const,
    id: sync.data.id,
    kind: sync.data.kind,
    row: toSyncRow({ sync: sync.data, sources, datePreferences }),
    paused: section(paused),
    skipped: section(skipped),
  };
}
