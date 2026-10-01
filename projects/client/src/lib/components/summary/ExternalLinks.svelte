<!--
  The sidebar's links out : grey tiles, text first, then icon tiles.
  Every link opens a new tab.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import type { ExternalLink } from './ExternalLink.ts';

const { links }: { links: readonly ExternalLink[] } = $props();
</script>

<!-- Links out to other sites. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if links.length > 0}
  <ul class="external-links">
    {#each links as link (link.href)}
      <li>
        <Tooltip text={link.title ?? (link.icon ? link.label : undefined)}>
          {#snippet trigger(tooltip)}
            <a href={link.href} target="_blank" rel="noopener" {...tooltip}>
              {#if link.icon}
                <Icon svg={link.icon} label={link.label} />
              {:else}
                {link.label}
              {/if}
            </a>
          {/snippet}
        </Tooltip>
      </li>
    {/each}
  </ul>
{/if}

<style>
.external-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0 14px;
  padding: 0;
  list-style: none;
}

a {
  display: inline-block;
  padding: 3px 5px;
  border: 1px solid var(--color-summary-tile-bg);
  border-radius: var(--radius-code);
  background-color: var(--color-summary-tile-bg);
  color: var(--color-summary-tile-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-summary-label);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-base);
  text-decoration: none;
  transition: all var(--transition-card);

  & :global(.icon) {
    padding-inline: 2px;
    box-sizing: content-box;
  }

  &:is(:hover, :focus-visible) {
    border-color: var(--color-summary-tile-hover-bg);
    background-color: var(--color-summary-tile-hover-bg);
    color: var(--color-card-text);
    text-decoration: none;
  }
}
</style>
