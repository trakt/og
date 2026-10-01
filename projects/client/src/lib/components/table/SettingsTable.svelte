<!--
  OG's settings table panel: a bordered
  box with a gray uppercase header row, light row rules and a hover tint. It scrolls sideways when narrow. Pass the
  `<table>` as children; the caller styles its own columns.
    <SettingsTable label="Data syncs"><table>...</table></SettingsTable>
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="settings-table">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need focus for keyboard scrolling.) -->
  <div class="scroll" role="region" aria-label={label} tabindex="0">{@render children()}</div>
</div>

<style>
.settings-table {
  margin-block-end: var(--line-height-computed);
  border: 1px solid var(--color-data-panel-border);
  background: var(--color-data-panel-bg);
}

.scroll {
  /* Positioned, so visually hidden text in a cell scrolls with the table instead of widening the page. */
  position: relative;
  overflow-x: auto;

  & :global(table) {
    inline-size: 100%;
    border-collapse: collapse;
  }

  & :global(:is(th, td)) {
    padding: var(--table-cell-padding);
    text-align: start;
    vertical-align: middle;
  }

  & :global(th) {
    background: var(--color-data-panel-header-bg);
    color: var(--color-data-panel-heading);
    border-block-end: 1px solid var(--color-data-panel-border);
    font-family: var(--font-headings);
    font-weight: var(--font-weight-headings-heavy);
    text-transform: uppercase;
    vertical-align: bottom;
    white-space: nowrap;
  }

  & :global(td) {
    border-block-start: 1px solid var(--color-data-panel-row-border);
  }

  & :global(tbody tr:first-child td) {
    border-block-start: 0;
  }

  & :global(tbody tr:hover) {
    background: var(--color-data-panel-hover);
  }
}
</style>
