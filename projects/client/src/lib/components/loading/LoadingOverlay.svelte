<!--
  OG's page loader (`#loading-bg`): a dark full-screen veil with the Trakt mark in the middle and an optional message
  under it. OG pulsed its logo; og fills the mark with TraktLoader. OG showed it on every page navigation and while
  forms submitted.
-->
<script lang="ts">
import TraktLoader from './TraktLoader.svelte';

const { visible, message }: { visible: boolean; message?: string } = $props();
</script>

<div class={['loading', { visible }]}>
    <TraktLoader label={message ?? 'Loading'} />
    {#if message}<p aria-hidden="true">{message}</p>{/if}
</div>

<style>
.loading {
  position: fixed;
  inset: 0;
  z-index: var(--z-loading);
  display: grid;
  place-content: center;
  justify-items: center;
  background-color: var(--color-backdrop);
  color: var(--color-text-inverse);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.5s, visibility 0.5s;

  &.visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

p {
  margin: var(--space-sm-inline) 0 0;
  animation: pulse 2s infinite linear;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
