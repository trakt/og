<!--
  OG's dropped badge (`global.js:975-986`): a minus circle over a darkened poster or fanart. Put it inside the
  positioned image box; the card greys its image out. Clicking the badge opens the shared restore confirmation.
-->
<script lang="ts">
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import type { VisibilityTarget } from '$lib/components/visibility/VisibilityTarget';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import circleMinus from '$lib/icons/regular/circle-minus.svg?raw';
const { target, date }: { target?: VisibilityTarget; date?: string } = $props();
</script>

<div class="dropped-badge">
  {#if target}
    <VisibilityControl {target} action="restore" variant="badge" tooltip={date ? `Dropped on\n${date}` : 'Dropped'}><Icon svg={circleMinus} /></VisibilityControl>
  {:else}
  <Tooltip text={date ? `Dropped on\n${date}` : 'Dropped'} placement="bottom">
    {#snippet trigger(tooltip)}
      <span role="img" aria-label="Dropped" {...tooltip}><Icon svg={circleMinus} /></span>
    {/snippet}
  </Tooltip>
  {/if}
</div>

<style>
.dropped-badge {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--gradient-dropped);
  color: var(--color-dropped-badge);
  font-size: var(--font-size-dropped-badge);
  line-height: 1;
  transition: color var(--transition-card);

  &:hover {
    color: var(--color-dropped-badge-hover);
  }
}

@media (width < 768px) {
  .dropped-badge {
    font-size: var(--font-size-dropped-badge-small);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dropped-badge {
    transition: none;
  }
}
</style>
