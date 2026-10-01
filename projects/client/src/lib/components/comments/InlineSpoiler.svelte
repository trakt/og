<!--
  An inline `[spoiler]` span (`global.js:5332-5343`): blurred on its own until clicked, even in a comment that's
  already readable. Until then it's one button, and what it hides is out of reach of the keyboard and screen readers.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import Tooltip from '../tooltip/Tooltip.svelte';

interface Props {
  children: Snippet;
}

const { children }: Props = $props();

let revealed = $state(false);

const reveal = (event: Event) => {
  event.preventDefault();
  revealed = true;
};
const onkeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') reveal(event);
};
</script>

<!-- One element throughout: swapping it out from under the focus it just got upsets the tooltip. -->
<Tooltip text={revealed ? undefined : 'Click to reveal spoilers'}>
  {#snippet trigger(tooltip)}
    <!-- It's a button, with its tabindex, until it's revealed. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <span
      class={['inline-spoiler', { visible: revealed }]}
      role={revealed ? undefined : 'button'}
      tabindex={revealed ? undefined : 0}
      aria-label={revealed ? undefined : 'Spoiler, click to reveal'}
      onclick={revealed ? undefined : reveal}
      onkeydown={revealed ? undefined : onkeydown}
      {...tooltip}
    ><span class={{ hidden: !revealed }} aria-hidden={revealed ? undefined : 'true'} inert={!revealed}>{@render children()}</span></span>
  {/snippet}
</Tooltip>

<style>
.inline-spoiler {
  cursor: pointer;
  filter: var(--blur-spoiler);
  transition: filter 0.5s;
}

.visible {
  cursor: inherit;
  filter: none;
}

.hidden {
  pointer-events: none;
}
</style>
