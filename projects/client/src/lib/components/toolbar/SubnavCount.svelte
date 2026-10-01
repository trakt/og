<!--
  The item counter on a subnav's right (`.comment-wrapper.subnav .interactions`): an icon, the number and the noun in
  small caps, with a tooltip.
    <SubnavCount svg={documentIcon} count={57} noun="item" tooltip="Items" />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';

interface Props {
  svg: string;
  count: number;
  /** Singular; an s is added unless the count is 1. */
  noun: string;
  tooltip: string;
}

const { svg, count, noun, tooltip }: Props = $props();
</script>

<Tooltip text={tooltip}>
  {#snippet trigger(attributes)}
    <span class="count" {...attributes}><Icon {svg} /> {count.toLocaleString('en-US')}
      {noun}{count === 1 ? '' : 's'}</span>
  {/snippet}
</Tooltip>

<style>
.count {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--brand-secondary);
  font-family: var(--font-headings);
  font-size: var(--font-size-note-author);
  text-transform: uppercase;

  & :global(.icon) {
    font-size: var(--font-size-history-count-icon);
  }
}
</style>
