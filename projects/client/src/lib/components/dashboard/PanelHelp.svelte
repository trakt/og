<!--
  A panel's gray help line under its heading (`h3.help-text`), lined up with the heading's text after its icon:
  "Sorted by Rank", "From the 2 members you follow + the Trakt community.".
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();
</script>

<p class="help">{@render children()}</p>

<style>
.help {
  margin: 1px 0 0 var(--space-help-text-inline);
  color: var(--color-help-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-help-text);
  line-height: var(--line-height-headings);
}
</style>
