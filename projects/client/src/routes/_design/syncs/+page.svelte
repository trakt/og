<script lang="ts">
import { page } from '$app/state';
import { toast } from '$lib/components/toast/toast.svelte';
import type { Source } from '$lib/components/watchnow/watchNow';
import SyncDetailsPage from '$lib/settings/syncs/SyncDetailsPage.svelte';
import SyncsPage from '$lib/settings/syncs/SyncsPage.svelte';
import { syncItemSchema } from '$lib/settings/syncs/syncItemSchema';
import { syncSchema } from '$lib/settings/syncs/syncSchema';
import { syncItemsFixture, syncsFixture } from '$lib/settings/syncs/syncsFixture';
import { toSyncItemTable } from '$lib/settings/syncs/toSyncItemTable';
import { toSyncRow } from '$lib/settings/syncs/toSyncRow';

// The Data tab, All Data Imports & Syncs and a sync's details against fake syncs, so they render signed out.
// `?view=data|syncs|empty|details|plex`. Undo never reaches the API: sync 102 fails, anything else succeeds.
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const logo = (slug: string) => `https://media.trakt.tv/watchnow/sources/${slug}.webp`;
const sources = new Map<string, Source>([
  ['netflix', { name: 'Netflix', color: '#e50914', logo: logo('netflix') }],
  ['amazon_prime_video', { name: 'Prime Video', color: '#0978f9', logo: logo('amazon_prime_video') }],
  ['plex', { name: 'Plex', color: '#000000', logo: logo('plex') }],
]);
const syncs = syncsFixture.map((row) => syncSchema.parse(row));
const rows = syncs.map((sync) => toSyncRow({ sync, sources, datePreferences }));
const list = (scope: 'import' | 'all', empty = false) => {
  const shown = empty ? [] : rows.filter((_, index) => scope === 'all' || (syncs[index]?.kind === 'import'));
  return {
    expired: false as const,
    rows: shown,
    count: scope === 'all' ? 46 : 7,
    latest: shown.at(0)?.date ?? null,
    page: { current: 1, total: 2 },
  };
};
const details = (plex: boolean) => {
  const sync = syncs.find((row) => row.id === (plex ? 157 : 102));
  if (!sync) throw new Error('fixture');
  const layout = plex ? 'plex' : 'younify';
  const table = (items: readonly unknown[]) =>
    toSyncItemTable({ items: items.map((item) => syncItemSchema.parse(item)), layout, sources, datePreferences });
  return {
    expired: false as const,
    id: sync.id,
    kind: sync.kind,
    row: toSyncRow({ sync, sources, datePreferences }),
    paused: { count: plex ? 0 : 1, page: { current: 1, total: 1 }, table: table(plex ? [] : syncItemsFixture.paused) },
    skipped: {
      count: plex ? 5155 : 2,
      page: { current: 1, total: plex ? 516 : 1 },
      table: table(plex ? syncItemsFixture.plexSkipped : syncItemsFixture.skipped),
    },
  };
};
function undo(id: number) {
  if (id === 102) toast.error('Doh! We ran into some sort of error.');
  else toast.success('Sync undone!');
  return Promise.resolve(id !== 102);
}
const view = $derived(page.url.searchParams.get('view') ?? 'data');
</script>

{#if view === 'details' || view === 'plex'}
  <SyncDetailsPage data={details(view === 'plex')} {undo} />
{:else}
  <SyncsPage data={list(view === 'syncs' ? 'all' : 'import', view === 'empty')}
  scope={view === 'syncs' ? 'all' : 'import'} {undo} />
{/if}
