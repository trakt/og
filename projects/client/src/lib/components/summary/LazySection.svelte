<!--
  The wrapper OG put around each lazy summary section (`#activity`, `#recent-comments-wrapper`, `#popular-lists-wrapper`,
  `#related-items`): an empty placeholder with the section's id, so the sidebar's anchors work, that loads its data
  once it nears the viewport and fades the section in. Nothing renders when the load fails or comes back empty
  (`null`), like OG's empty responses.
    <LazySection id="activity" load={() => client.activity(media)}>
      {#snippet children(activity)}<ActivityTabs {activity} />{/snippet}
    </LazySection>
-->
<script lang="ts" generics="T">
import type { Snippet } from 'svelte';
import { nearViewport } from '../../utils/nearViewport.ts';

interface Props {
  /** The anchor the section nav jumps to. */
  id?: string;
  load: () => Promise<T | null>;
  children: Snippet<[T]>;
}

const { id, load, children }: Props = $props();

let data = $state<T | null>(null);

const start = () => {
  load().then((loaded) => (data = loaded)).catch(() => (data = null));
};
</script>

<div {id} class="lazy-section" {@attach nearViewport(start)}>
  {#if data !== null}
    <div class="loaded">{@render children(data)}</div>
  {/if}
</div>

<style>
/* jQuery's fadeIn, 400ms. */
.loaded {
  animation: fade-in 0.4s ease-in-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loaded {
    animation: none;
  }
}
</style>
