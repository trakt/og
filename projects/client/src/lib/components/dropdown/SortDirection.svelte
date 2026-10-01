<!--
  OG's `#sort-direction` next to a sort dropdown: an arrow that points down for the sort's own direction and turns
  red and points up once flipped. A toggle button, so `aria-pressed` says which.
    <SortDirection bind:flipped />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import arrow from '$lib/icons/trakt/arrow-right.svg?raw';

let { flipped = $bindable(false) }: { flipped?: boolean } = $props();
</script>

<Tooltip text="Direction">
  {#snippet trigger(tooltip)}
    <button
      type="button"
      class={['direction', { flipped }]}
      aria-label="Reverse the sort"
      aria-pressed={flipped}
      onclick={() => (flipped = !flipped)}
      {...tooltip}
    >
      <Icon svg={arrow} />
    </button>
  {/snippet}
</Tooltip>

<style>
.direction {
  min-block-size: 0;
  margin: 0 7px 0 9px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-sort-direction);
  line-height: 1;
  vertical-align: middle;
  transition: color 0.5s;

  & :global(.icon) {
    rotate: 90deg;
    transition: rotate 0.5s;
  }

  &.flipped {
    color: var(--brand-primary);

    & :global(.icon) {
      rotate: 270deg;
    }
  }
}
</style>
