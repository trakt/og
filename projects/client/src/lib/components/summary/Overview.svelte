<!--
  A summary's tagline and overview. An overview taller than 300px collapses under a fade with a "Read more..."
  toggle, like OG's readmore plugin.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';

interface Props {
  tagline?: string | null;
  overview?: string | null;
  /** Episode list overviews collapse at 200px, summary overviews at 300px. */
  compact?: boolean;
}

const { tagline, overview, compact = false }: Props = $props();
const id = $props.id();

let collapsible = $state(false);
let expanded = $state(false);

const measure: Attachment<HTMLElement> = (element) => {
  collapsible = element.scrollHeight > element.clientHeight;
};
</script>

{#if tagline}
  <p class="tagline">{tagline}</p>
{/if}
{#if overview}
  <div
  {id}
  class={['overview', { collapsed: !expanded, collapsible, compact }]}
  {@attach measure}
>
    {overview}
  </div>
  {#if collapsible}
    <button type="button" class="toggle" aria-controls={id} aria-expanded={expanded}
  onclick={() => (expanded = !expanded)}>
      {expanded ? 'Read less...' : 'Read more...'}
    </button>
  {/if}
{/if}

<style>
.tagline {
  margin: 0 0 10px;
  font-family: var(--font-serif);
  font-style: italic;
}

.overview {
  position: relative;
  margin: 0 0 var(--gutter);

  &.compact {
    --overview-collapsed: var(--episode-overview-collapsed);
  }

  &.collapsed {
    max-block-size: var(--overview-collapsed);
    overflow: hidden;
  }

  &.collapsed.collapsible::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    block-size: 100px;
    background: linear-gradient(transparent, var(--color-overview-shade));
  }
}

.toggle {
  min-block-size: 0;
  display: block;
  margin: calc(-1 * var(--gutter)) 0 var(--gutter);
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-link);
  font: inherit;
  cursor: pointer;

  &:is(:hover, :focus-visible) {
    color: var(--color-link-hover);
    text-decoration: underline;
  }
}
</style>
