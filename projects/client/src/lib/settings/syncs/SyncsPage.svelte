<!--
  The Data tab and All Data Imports & Syncs: OG's heading, a
  green notice with how many syncs there are and when the newest ran, the syncs table and its pagination. The Data
  tab's "Import Your Data" is cut with the importer, so the page starts at Data Imports.
-->
<script lang="ts">
import { resolve } from '$app/paths';
import { login } from '$lib/auth/login';
import Container from '$lib/components/container/Container.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import InlineNotice from '$lib/components/notice/InlineNotice.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import alien from '$lib/icons/solid/alien-8bit.svg?raw';
import info from '$lib/icons/solid/circle-info.svg?raw';
import cloudBinary from '$lib/icons/thin/cloud-binary.svg?raw';
import type { loadSyncs } from './loadSyncs';
import SyncsTable from './SyncsTable.svelte';

interface Props {
  data: Awaited<ReturnType<typeof loadSyncs>>;
  scope: 'import' | 'all';
  undo?: (id: number) => Promise<boolean>;
}

const { data, scope, undo }: Props = $props();

const COPY = {
  import: {
    title: 'Data',
    heading: 'Data Imports',
    help: 'Recent data imports from other services.',
    notice: ["You've imported data", 'Your most recent import was'],
    empty: "You haven't imported any data yet.",
    description: 'Your recent data imports from other services, and undoing them.',
  },
  all: {
    title: 'Syncs',
    heading: 'All Data Imports & Syncs',
    help: 'Recent data imports from other services and syncs from your connected streaming services.',
    notice: ['Data has been synced', 'Your most recent sync was'],
    empty: 'No data has been synced yet.',
    description: 'Every data import and streaming sync on your account, and undoing them.',
  },
} as const;

const copy = $derived(COPY[scope]);
</script>

<svelte:head>
  <title>{copy.title} - Trakt</title>
  <meta name="description" content={copy.description} />
</svelte:head>

<SettingsHeader current={scope === 'import' ? 'data' : 'syncs'} />

<section class="syncs">
  <Container>
    {#if data.expired}
      <div class="expired">
        <NoData>Your session has expired. <a href={resolve('/settings/data')} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to see your data syncs.</NoData>
      </div>
    {:else}
      <SettingsSectionHeading icon={cloudBinary} help={copy.help}>
        {#snippet title()}{copy.heading}{/snippet}
      </SettingsSectionHeading>
      {#if data.rows.length}
        <div class="notice">
          <InlineNotice svg={alien} tone="success">
            <span>{copy.notice[0]} <b>{data.count.toLocaleString('en-US')}</b> {data.count === 1 ? 'time' : 'times'}. {copy.notice[1]} <b>{data.latest}</b>.</span>
          </InlineNotice>
        </div>
        <SyncsTable rows={data.rows} {undo} />
        <div class="pagination"><Pagination meta={data.page} /></div>
      {:else}
        <div class="notice"><InlineNotice svg={info}>{copy.empty}</InlineNotice></div>
      {/if}
      <hr />
    {/if}
  </Container>
</section>

<style>
.expired {
  padding-block-start: var(--settings-top-padding);
}

.pagination {
  margin-block-end: var(--settings-pagination-end);
}

.notice {
  margin-block-end: var(--settings-section-gap);
}

hr {
  margin-block: var(--settings-rule-gap) 0;
  padding-block-start: var(--settings-section-gap);
  border: 0;
  border-block-start: 1px solid var(--color-settings-rule);
}
</style>
