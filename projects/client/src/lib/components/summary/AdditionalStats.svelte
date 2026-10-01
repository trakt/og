<!--
  OG's `ul.additional-stats`: the inline "LABEL value" facts under a summary's fanart (released, runtime,
  director, genres, ...). Fill it with AdditionalStat rows.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();
</script>

<ul class="additional-stats">
  {@render children()}
</ul>

<style>
.additional-stats {
  margin: 0 0 var(--gutter);
  padding: 0;
  list-style: none;
}
</style>
