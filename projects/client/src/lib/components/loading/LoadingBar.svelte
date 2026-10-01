<!--
  OG's background-work bar (`#loading-bottom`): a dark strip across the bottom of the window with a spinning refresh
  icon and an uppercase line, "Loading..." unless you pass `text` (OG said "Caching your data..." while it synced).
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import arrowsRotate from '$lib/icons/solid/arrows-rotate.svg?raw';

const { visible, text = 'Loading...' }: { visible: boolean; text?: string } = $props();
</script>

<div class={['loading-bar', { visible }]} role="status">
    <span class="spin"><Icon svg={arrowsRotate} /></span>
    {text}
</div>

<style>
.loading-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-loading-bar);
  padding: var(--space-lg-block) var(--gutter);
  background-color: var(--color-backdrop);
  color: var(--color-text-inverse);
  font-size: var(--font-size-small);
  text-align: center;
  text-transform: uppercase;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s, visibility 0.5s;

  &.visible {
    opacity: 1;
    visibility: visible;
  }
}

.spin {
  display: inline-block;
  margin-inline-end: var(--space-xs-inline);
  animation: spin 2s infinite linear;
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}
</style>
