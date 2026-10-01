<!--
  OG's "Toggle Dividers" icon: shows or hides every day divider,
  red while they're hidden. The choice is kept in the `filter-hide-dividers` cookie, so SSR renders the same.
    <DividersToggle bind:shown={dividers} />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import dividers from '$lib/icons/thin/arrows-to-dotted-line.svg?raw';

let { shown = $bindable() }: { shown: boolean } = $props();

function toggle() {
  shown = !shown;
  document.cookie = `filter-hide-dividers=${shown ? '' : '1'}; path=/; samesite=lax; max-age=${shown ? 0 : 31_536_000}`;
}
</script>

<Tooltip text="Toggle Dividers">
  {#snippet trigger(tooltip)}
    <button type="button" class={['toggle', { selected: !shown }]} aria-label="Day dividers" aria-pressed={shown}
      onclick={toggle} {...tooltip}>
      <Icon svg={dividers} />
    </button>
  {/snippet}
</Tooltip>

<style>
.toggle {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-filter-icon);
  font-size: var(--font-size-filter-icon);
  line-height: 1;
  vertical-align: middle;
  transition: color 0.5s;

  &.selected {
    color: var(--brand-primary);
  }
}
</style>
