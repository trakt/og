<!--
  OG's page loader (`#loading-bg`): a dark full-screen veil with the Trakt logo pulsing in the middle and an optional
  message under it. OG showed it on every page navigation and while forms submitted.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import traktLogo from '$lib/icons/trakt/trakt.svg?raw';

const { visible, message }: { visible: boolean; message?: string } = $props();
</script>

<div class={['loading', { visible }]} role="status">
    <span class="logo"><Icon svg={traktLogo} label={message ? undefined : 'Loading'} /></span>
    {#if message}<p>{message}</p>{/if}
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

.logo {
  font-size: var(--font-size-loading-logo);
  line-height: 1;
}

.logo,
p {
  animation: pulse 2s infinite linear;
}

p {
  margin: var(--space-sm-inline) 0 0;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
