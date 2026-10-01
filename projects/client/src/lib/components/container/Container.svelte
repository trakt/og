<!--
  OG's fixed-width page column:
  full width with a half-gutter each side on phones, then 740, 960, 1160 and 1560px wide from 768, 992, 1200 and
  1600px. Pages put their content in one of these inside the layout's <main>.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();
</script>

<div class="container">
  {@render children()}
</div>

<style>
.container {
  margin-inline: auto;
  padding-inline: calc(var(--gutter) / 2);

  @media (min-width: 768px) {
    inline-size: var(--container-sm);
  }

  @media (min-width: 992px) {
    inline-size: var(--container-md);
  }

  @media (min-width: 1200px) {
    inline-size: var(--container-lg);
  }

  @media (min-width: 1600px) {
    inline-size: var(--container-xlg);
  }
}
</style>
