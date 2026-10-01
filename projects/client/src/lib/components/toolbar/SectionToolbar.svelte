<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import type { Snippet } from 'svelte';
const { filters, summary, inSummary = false }: { filters: Snippet; summary: Snippet; inSummary?: boolean } = $props();
</script>

<section class="section-toolbar" aria-label="Page filters">
  <Container>
    <div class={["toolbar", { "in-summary": inSummary }]}>
      <div class="filters">{@render filters()}</div>
      <div class="summary">{@render summary()}</div>
    </div>
  </Container>
</section>

<style>
.section-toolbar {
  padding-block: var(--toolbar-padding);
  background: var(--color-toolbar-bg);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--toolbar-gap);
}
.in-summary {
  margin-inline-start: var(--summary-offset);
  @media (width < 992px) {
    margin-inline-start: var(--summary-offset-sm);
  }
  @media (width < 768px) {
    margin-inline-start: 0;
  }
}
.filters,
.summary {
  display: flex;
  align-items: center;
  gap: var(--toolbar-gap);
}
</style>
