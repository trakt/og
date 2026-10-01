<!--
  OG's empty-list notice (`.alert.alert-no-data`): a gray box with an italic line. Most pages say
  "Nothing to see here. Move along, move along.", which is the default; pass children for anything else.
  `inFrame` is the flush, dark version inside a sidenav frame ("Nothing on this day." on the calendars).
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { children, inFrame = false }: { children?: Snippet; inFrame?: boolean } = $props();
</script>

<p class={['no-data', { 'in-frame': inFrame }]}>
  {#if children}{@render children()}{:else}Nothing to see here. Move along, move along.{/if}
</p>

<style>
.no-data {
  margin: 0 0 var(--line-height-computed);
  padding: var(--space-panel);
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  background-color: var(--color-no-data-bg);
  color: var(--color-no-data-text);
  font-style: italic;

  &.in-frame {
    margin: 0;
    background-color: var(--color-frame);
    color: var(--color-frame-muted);
  }
}
</style>
