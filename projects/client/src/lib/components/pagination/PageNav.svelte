<!--
  OG's "Previous page" / "Next page" row under a frame grid.
  The side with no page shows as dim text. Renders nothing when neither side has a page.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import arrowLeft from '$lib/icons/trakt/arrow-left.svg?raw';
import arrowRight from '$lib/icons/trakt/arrow-right.svg?raw';

interface Props {
  prevHref?: string;
  nextHref?: string;
  /** "Previous page", "Previous week". */
  unit?: string;
}

const { prevHref, nextHref, unit = 'page' }: Props = $props();
</script>

<!-- The hrefs keep the current path and query, so resolve() has nothing to add. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if prevHref || nextHref}
  <nav aria-label="Pagination">
    {#if prevHref}
      <a href={prevHref} rel="prev"><Icon svg={arrowLeft} />Previous {unit}</a>
    {:else}
      <span aria-disabled="true"><Icon svg={arrowLeft} />Previous {unit}</span>
    {/if}
    {#if nextHref}
      <a href={nextHref} rel="next">Next {unit}<Icon svg={arrowRight} /></a>
    {:else}
      <span aria-disabled="true">Next {unit}<Icon svg={arrowRight} /></span>
    {/if}
  </nav>
{/if}

<style>
nav {
  display: flex;
  justify-content: space-between;
  padding: var(--space-lg-block);
}

span {
  color: var(--color-frame-disabled);
}

nav :global(.icon) {
  font-size: var(--font-size-icon-lg);
  line-height: 1;

  &:first-child {
    margin-inline-end: var(--space-xs-inline);
  }

  &:last-child {
    margin-inline-start: var(--space-xs-inline);
  }
}
</style>
