<script lang="ts">
import type { Snippet } from 'svelte';

const { label, heading, children }: { label: string; heading: Snippet; children: Snippet } = $props();
</script>

<div class="data-panel">
  <div class="heading">{@render heading()}</div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need focus for keyboard scrolling.) -->
  <div class="scroll" role="region" aria-label={label} tabindex="0">{@render children()}</div>
</div>

<style>
.data-panel {
  margin-block-end: var(--gutter);
  border: 1px solid var(--color-data-panel-border);
  background: var(--color-data-panel-bg);
}
.heading {
  padding: var(--table-cell-padding);
  border-block-end: 1px solid var(--color-data-panel-border);
  color: var(--color-data-panel-heading);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}
.scroll {
  overflow-x: auto;
}
.scroll :global(table) {
  inline-size: 100%;
  border-collapse: collapse;
}
.scroll :global(th),
.scroll :global(td) {
  padding: var(--table-cell-padding);
  min-inline-size: var(--data-panel-column-width);
  white-space: nowrap;
  text-align: start;
}
.scroll :global(th) {
  background: var(--color-data-panel-header-bg);
  color: var(--color-data-panel-heading);
  border-block-end: 1px solid var(--color-data-panel-border);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
}
.scroll :global(td) {
  border-block-start: 1px solid var(--color-data-panel-row-border);
}
.scroll :global(tr:first-child td) {
  border-block-start: 0;
}
.scroll :global(tbody tr:hover) {
  background: var(--color-data-panel-hover);
}
.scroll :global(td:last-child) {
  inline-size: 100%;
}
</style>
