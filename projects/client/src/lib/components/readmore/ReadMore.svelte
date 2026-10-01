<!--
  OG's readmore.js (`global.js:5512-5535`): text taller than 300px collapses under a fading shade with "Read more...",
  and expands with "Read less...". Set `--read-more-shade` to the background the text sits on, and
  `--comment-collapsed-height: none` where OG never collapsed the text.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
}

const { children }: Props = $props();
const id = $props.id();

// readmore.js left anything within its 16px height margin alone.
const HEIGHT_MARGIN = 16;

let collapsible = $state(false);
let expanded = $state(false);

const measure = (element: HTMLElement) => {
  const height = getComputedStyle(element).getPropertyValue('--collapsed-height').trim();
  if (height === 'none') return;
  const collapsed = Number.parseFloat(height) || 300;
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    // Updating the collapsed layout during ResizeObserver delivery can trigger a browser resize loop.
    frame = requestAnimationFrame(() => {
      collapsible = element.scrollHeight > collapsed + HEIGHT_MARGIN;
    });
  });
  observer.observe(element);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
};
</script>

<div
  id="{id}-text"
  class={['read-more', { collapsed: collapsible && !expanded, expanded: collapsible && expanded }]}
  {@attach measure}
>
  {@render children()}
  <div class="shade"></div>
</div>
{#if collapsible}
  <button
  type="button"
  class="toggle"
  aria-expanded={expanded}
  aria-controls="{id}-text"
  onclick={() => (expanded = !expanded)}
>
    {expanded ? 'Read less...' : 'Read more...'}
  </button>
{/if}

<style>
.read-more {
  --collapsed-height: var(--comment-collapsed-height);
  position: relative;
}

.shade {
  display: none;
}

.collapsed {
  max-block-size: var(--collapsed-height);
  overflow: hidden;
  margin-block-end: var(--gutter);

  & .shade {
    display: block;
    position: absolute;
    inset: auto 0 0;
    block-size: var(--comment-shade-height);
    /* OG's shade swallowed clicks; the links and spoilers under it stay clickable here. */
    pointer-events: none;
    background-image: linear-gradient(
      color-mix(in srgb, var(--read-more-shade) 0%, transparent),
      var(--read-more-shade)
    );
  }
}

.expanded {
  margin-block-end: calc(var(--gutter) * 2);
}

/* A link in OG, pulled up under the text. */
.toggle {
  display: block;
  min-block-size: 0;
  margin-block-start: calc(var(--gutter) * -1);
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-link);

  &:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }
}
</style>
