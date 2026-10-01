<!--
  OG's filter eye (`#filter-fade-hide`): a dropdown behind an eye icon that turns red and gets struck through
  while any filter is on. Fill it like a Dropdown: "Show All", then li.header groups of aria-pressed toggles.
  `count` puts OG's `.filter-counter` badge on it. `variant="frame"` is the solid white eye in a Frame's title.
-->
<script lang="ts">
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import Icon from '$lib/icons/Icon.svelte';
import solidEye from '$lib/icons/solid/eye.svg?raw';
import thinEye from '$lib/icons/thin/eye.svg?raw';
import type { Snippet } from 'svelte';

interface Props {
  /** Something is filtered out. */
  active: boolean;
  /** The selected options, badged when above 0. */
  count?: number;
  variant?: 'default' | 'frame';
  children: Snippet;
}

const { active, count = 0, variant = 'default', children }: Props = $props();
</script>

<span class={['filter-menu', variant, { active }]}>
  {#if count > 0}<span class="counter" aria-hidden="true">{count.toLocaleString('en-US')}</span>{/if}
  <Dropdown variant="icon" label={count > 0 ? `Filters (${count} on)` : 'Filters'}>
    {#snippet trigger()}<span class="eye"
      ><Icon svg={variant === 'frame' ? solidEye : thinEye} /><span class="line"></span></span
    >{/snippet}
    {@render children()}
  </Dropdown>
</span>

<style>
.filter-menu {
  position: relative;
  color: var(--color-filter-icon);
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: normal;

  &.frame {
    color: var(--color-filter-icon-frame);
    font-size: var(--font-size-filter-icon-frame);
  }

  &.active {
    color: var(--brand-primary);
  }
}

/* OG's .filter-counter: a pill over the eye's top-right. */
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

.eye {
  position: relative;
  display: inline-block;
  margin-inline: 5px 3px;
  font-size: var(--font-size-filter-icon);
  line-height: 1;

  .frame & {
    font-size: inherit;
  }
  vertical-align: middle;
  transition: color 0.5s;
}

/* The strike through the eye while filtering. */
.line {
  position: absolute;
  inset-block-start: 45%;
  inset-inline-start: 0;
  inline-size: 100%;
  block-size: 1px;
  background-color: var(--brand-primary);
  rotate: -45deg;
  opacity: 0;
  transition: opacity 0.5s;

  .active & {
    opacity: 1;
  }
}
</style>
