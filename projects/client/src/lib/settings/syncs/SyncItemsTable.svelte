<!--
  A page of a sync's paused or skipped items:
  green cells matched, red ones caused the skip. Links to a service or a search open in a new tab, like OG's.
-->
<script lang="ts">
import SettingsTable from '$lib/components/table/SettingsTable.svelte';
import ServiceTile from '$lib/components/watchnow/ServiceTile.svelte';
import type { SyncItemTable } from './toSyncItemTable';

const { table, label }: { table: SyncItemTable; label: string } = $props();
</script>

<!-- Item and search links are built by the mapper. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<SettingsTable {label}>
  <table class={{ 'end-aligned': table.endAligned }}>
    <thead>
      <tr>{#each table.headers as header, index (index)}<th scope="col">{header}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each table.rows as row, index (index)}
        <tr>
          {#each row as cell, column (column)}
            <td class={[cell.tone, { first: column === 0, service: cell.service }]}>
              {#if cell.service}
                <ServiceTile link={{ ...cell.service, slug: '' }} />
              {/if}
              {#each cell.lines as line, at (at)}
                <div class={{ bad: line.bad }}>
                  {#if line.href}
                    <a href={line.href} target={line.newTab ? '_blank' : undefined}
                      rel={line.newTab ? 'noopener' : undefined}>{line.text}</a>
                  {:else}{line.text}{/if}
                </div>
              {/each}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</SettingsTable>

<style>
.end-aligned :is(th, td):last-child {
  text-align: end;
}

.first {
  inline-size: var(--syncs-date-width);
  white-space: nowrap;
}

.service {
  inline-size: var(--syncs-service-width);
  --service-width: var(--syncs-tile-width);
  --service-height: var(--syncs-tile-height);
  --service-padding: var(--syncs-tile-padding);

  & :global(.service) {
    margin-inline-start: calc(-1 * var(--space-xs-inline));
  }
}

/* OG's `sync-good` and `sync-bad`: the cell and its links, underlined in a darker shade. */
.good {
  --sync-underline: var(--color-sync-good-underline);
  color: var(--color-sync-good);
}

.bad {
  --sync-underline: var(--color-sync-bad-underline);
  color: var(--color-sync-bad);
}

td a {
  border-block-end: 1px solid var(--sync-underline, transparent);
  color: inherit;

  &:is(:hover, :focus-visible) {
    border-block-end-color: currentColor;
    color: inherit;
  }
}
</style>
