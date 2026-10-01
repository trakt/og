<!--
  OG's danger zone at the bottom of the Advanced tab (`section.danger-zone`): a thin hazard-striped divider in red and
  white, then a black band in both themes. OG hides its "Danger Zone" text, so here it only names the region.
    <DangerZone>...the notice and the destructive blocks...</DangerZone>
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();
</script>

<section class="danger-zone" aria-label="Danger Zone">
  <div class="divider"></div>
  <Container>{@render children()}</Container>
</section>

<style>
.danger-zone {
  padding-block-end: var(--danger-zone-bottom);
  background-color: var(--color-danger-zone-bg);
  color: var(--color-danger-zone-text);
}

.divider {
  margin-block-end: var(--danger-zone-divider-gap);
  padding-block: var(--danger-zone-divider-padding);
  border-block: 1px solid var(--color-danger-zone-rule);
  background: repeating-linear-gradient(
    45deg,
    var(--color-danger-zone-stripe) 0 var(--danger-zone-stripe),
    var(--color-danger-zone-stripe-alt) var(--danger-zone-stripe) calc(2 * var(--danger-zone-stripe))
  );
}
</style>
