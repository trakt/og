<!--
  OG's funnel: slides the advanced filter panel
  out and back. Its caret points the way the panel will move, it turns red while filters are on, and `count` puts
  OG's `.filter-counter` badge on it. `a` toggles it too, except while typing .
    <AdvancedFiltersToggle bind:open controls="chart-filters" active count={3} />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import caretRight from '$lib/icons/solid/caret-right.svg?raw';
import filtersIcon from '$lib/icons/solid/filters.svg?raw';

interface Props {
  open: boolean;
  /** The panel's id. */
  controls: string;
  /** Filters are on: the funnel turns red. */
  active: boolean;
  /** Applied filters, badged when above 0. OG counted the sidebar's tags, which only VIPs got. */
  count: number;
  /** Lets the page hand focus back here when the panel closes. */
  button?: HTMLButtonElement;
}

let { open = $bindable(), controls, active, count, button = $bindable() }: Props = $props();

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'a' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  open = !open;
}
</script>

<svelte:window {onkeydown} />

<Tooltip text="Advanced Filters">
  {#snippet trigger(tooltip)}
    <button
      bind:this={button}
      type="button"
      class={['toggle', { active, open }]}
      aria-label={count > 0 ? `Advanced Filters (${count} on)` : 'Advanced Filters'}
      aria-expanded={open}
      aria-controls={controls}
      onclick={() => (open = !open)}
      {...tooltip}
    >
      {#if count > 0}<span class="counter" aria-hidden="true">{count.toLocaleString('en-US')}</span>{/if}
      <Icon svg={filtersIcon} /><span class="caret"><Icon svg={caretRight} /></span>
    </button>
  {/snippet}
</Tooltip>

<style>
.toggle {
  position: relative;
  display: inline-block;
  min-block-size: 0;
  margin-inline: var(--filter-toggle-gap) calc(-1 * var(--filter-toggle-overhang));
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-filter-icon-frame);
  font-size: var(--font-size-filter-toggle);
  line-height: 1;
  vertical-align: middle;

  & > :global(.icon) {
    margin-inline-end: 3px;
  }

  &.active {
    color: var(--brand-primary);
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: color var(--transition-frame);
  }
}

.caret {
  display: inline-block;
  margin-inline-start: 4px;
  font-size: var(--font-size-filter-toggle-caret);
  vertical-align: top;

  .open & {
    scale: -1 1;
  }
}

/* OG's .filter-counter: a pill over the funnel's top-right. */
.counter {
  position: absolute;
  inset-block-start: -8px;
  inset-inline-end: 8px;
  z-index: 1;
  min-inline-size: 14px;
  padding: 2px 3px;
  border-radius: 8px;
  background-color: var(--color-filter-counter-bg);
  color: var(--color-filter-counter-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-filter-counter);
  font-weight: var(--font-weight-headings-heavy);
  line-height: 1;
  text-align: center;
  pointer-events: none;
}
</style>
