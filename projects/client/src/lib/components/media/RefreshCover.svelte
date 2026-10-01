<!--
  OG's `.refresh-progress-item` (`global.js:1545-1587`): after a watch on an on-deck card or a progress row's next
  episode, a shade over the artwork with "Next Episode" that reloads the item, and a spinner while it reloads. Place it
  inside a positioned box: it covers the whole of it.
-->
<script lang="ts">
import Spinner from '$lib/components/loading/Spinner.svelte';
import Icon from '$lib/icons/Icon.svelte';
import arrowRight from '$lib/icons/solid/arrow-right-long.svg?raw';

interface Props {
  /** What's reloading, for the spinner's label. */
  title: string;
  refreshing: boolean;
  onrefresh?: () => void;
}

const { title, refreshing, onrefresh }: Props = $props();
</script>

{#if refreshing}
  <div class="refresh-cover loading">
  <Spinner label="Refreshing {title}" />
</div>
{:else}
  <button class="refresh-cover" type="button"
  onclick={onrefresh}><span>Next Episode <Icon svg={arrowRight} /></span></button>
{/if}

<style>
.refresh-cover {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: var(--on-deck-refresh-gradient);
  color: var(--color-text-inverse);
  text-align: center;
  font-family: var(--font-headings);
  font-size: var(--on-deck-refresh-size);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
  cursor: pointer;

  & span {
    position: absolute;
    inset-inline: 0;
    inset-block-end: var(--space-lg-block);
  }

  &:focus-visible {
    outline: var(--watch-focus) solid var(--color-input-border-focus);
    outline-offset: calc(-1 * var(--watch-focus));
  }

  &.loading {
    display: grid;
    place-items: center;
    background: var(--on-deck-refresh-loading);
    cursor: wait;
  }
}
</style>
