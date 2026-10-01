<!--
  OG's instruction band (`h3.instructions`): a semantic h3 between groups of settings inside a panel's h2, or with
  `sentence` a paragraph, for the band that explains the whole panel (Watch Now, Spoilers).
-->
<script lang="ts">
import type { Snippet } from 'svelte';
const { middle = false, sentence = false, children }: { middle?: boolean; sentence?: boolean; children: Snippet } =
  $props();
</script>
<svelte:element this={sentence ? 'p' : 'h3'} class={['band', { middle }]}>{@render children()}</svelte:element>
<style>
.band {
  margin: 0 0 var(--settings-instruction-bottom);
  padding: var(--settings-instruction-padding);
  border-block-end: 1px solid var(--color-settings-instruction-border);
  background: var(--color-settings-instruction-bg);
  font-family: var(--font-headings);
  font-size: var(--font-size-settings-instruction);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);
  &.middle {
    margin-block-start: var(--settings-instruction-middle);
    border-block-start: 1px solid var(--color-settings-instruction-border);
  }
  /* The panel body gets inline padding on a phone; the band still spans the panel. */
  @media (max-width: 767px) {
    margin-inline: calc(var(--settings-instruction-phone-inline) * -1);
  }
}
</style>
