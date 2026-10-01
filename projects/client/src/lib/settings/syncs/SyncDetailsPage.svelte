<!--
  Sync details: the sync's row, Younify's known issues, then its paused items and its
  skipped items, each a table of ten a page. OG's admin-only raw JSON is cut.
-->
<script lang="ts">
import { resolve } from '$app/paths';
import { login } from '$lib/auth/login';
import Container from '$lib/components/container/Container.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import cloudBinary from '$lib/icons/thin/cloud-binary.svg?raw';
import forward from '$lib/icons/thin/forward.svg?raw';
import pause from '$lib/icons/thin/pause.svg?raw';
import KnownIssues from './KnownIssues.svelte';
import type { loadSyncDetails } from './loadSyncDetails';
import SyncItemsTable from './SyncItemsTable.svelte';
import SyncsTable from './SyncsTable.svelte';

interface Props {
  data: Awaited<ReturnType<typeof loadSyncDetails>>;
  undo?: (id: number) => Promise<boolean>;
}

const { data, undo }: Props = $props();
const items = (count: number) => `${count === 1 ? 'Item' : 'Items'}`;
</script>

<svelte:head>
  <title>Sync Details - Trakt</title>
  <meta name="description" content="What one data sync added, paused and skipped, and why." />
</svelte:head>

<SettingsHeader current="syncs" />

<section class="sync">
  <Container>
    {#if data.expired}
      <div class="expired">
        <NoData>Your session has expired. <a href={resolve('/settings/data')} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to see this sync.</NoData>
      </div>
    {:else}
      <SettingsSectionHeading icon={cloudBinary} help="Some details about this sync.">
        {#snippet title()}Sync ID <b>{data.id}</b>{/snippet}
      </SettingsSectionHeading>
      <SyncsTable rows={[data.row]} {undo} />
      {#if data.kind === 'younify'}<KnownIssues />{/if}

      {#if data.paused.count > 0}
        <hr />
        <SettingsSectionHeading icon={pause} help="These items were added as paused, since they were not at least 80% watched.">
          {#snippet title()}<b>{data.paused.count.toLocaleString('en-US')}</b> Paused {items(data.paused.count)}{/snippet}
        </SettingsSectionHeading>
        <SyncItemsTable table={data.paused.table} label="Paused items" />
        <div class="pagination"><Pagination meta={data.paused.page} label="Paused items pages" /></div>
      {/if}

      {#if data.skipped.count > 0}
        <hr />
        <SettingsSectionHeading icon={forward} help="Some useful info to help identify what was skipped and why. Anything in red caused the item to be skipped.">
          {#snippet title()}{data.skipped.table.section ? `${data.skipped.table.section} — ` : ''}<b>{data.skipped.count.toLocaleString('en-US')}</b> Skipped {items(data.skipped.count)}{/snippet}
        </SettingsSectionHeading>
        <SyncItemsTable table={data.skipped.table} label="Skipped items" />
        <div class="pagination"><Pagination meta={data.skipped.page} label="Skipped items pages" /></div>
      {/if}
    {/if}
  </Container>
</section>

<style>
.expired {
  padding-block-start: var(--settings-top-padding);
}

hr {
  margin-block: var(--settings-rule-gap-wide) 0;
  padding-block-start: var(--settings-section-gap);
  border: 0;
  border-block-start: 1px solid var(--color-settings-rule);
}

.pagination {
  margin-block-end: var(--settings-pagination-end);
}
</style>
