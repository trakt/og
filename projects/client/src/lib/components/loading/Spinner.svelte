<!--
  OG's inline spinner (`.fa.fa-refresh.fa-spin`), as in a panel heading while its data loads. It takes its size and
  color from the text around it. Reduced motion keeps the icon still.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import arrowsRotate from '$lib/icons/solid/arrows-rotate.svg?raw';

const { label = 'Loading' }: { label?: string } = $props();
</script>

<span class="spinner" role="status" aria-label={label}><Icon svg={arrowsRotate} /></span>

<style>
.spinner {
  display: inline-block;
  animation: spin 2s infinite linear;
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
