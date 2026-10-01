<!--
  The title block of a slim fanart header on a subpage: the label line ("Release dates for...", "Shout by NAME"), for
  seasons and episodes the show and season as links, then the h1 linking back to the item.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import type { SpoilerTarget } from '$lib/settings/SpoilerTarget';
import Icon from '$lib/icons/Icon.svelte';

interface Props {
  label: string;
  target?: SpoilerTarget;
  icon?: string;
  /** OG's h2 above the title: the show, then the season. */
  parents?: readonly { readonly title: string; readonly href: string }[];
  title: string;
  year?: number | null;
  href: string;
}

const { label, icon, parents = [], title, year, href, target }: Props = $props();
// OG's "Show: Season 1". A literal space would be trimmed at the block's edge.
const separator = ': ';
</script>

<!-- The item's canonical URL comes from the API slug. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="subpage-title">
  <p>{#if icon}<Icon svg={icon} />{/if} {label}</p>
  {#if parents.length > 0}
    <!-- A paragraph, so the page's first heading is the h1. -->
    <p class="parents">
      {#each parents as parent, i (parent.href)}{#if i > 0}{separator}{/if}<a href={parent.href}>{parent.title}</a>{/each}
    </p>
  {/if}
  <h1><MediaSpoiler {target} kind="title" inline><a {href}>{title}{#if year}<span class="year">{` ${year}`}</span>{/if}</a></MediaSpoiler></h1>
</div>

<style>
.subpage-title {
  padding-inline-start: var(--summary-offset);
  @media (width < 992px) {
    padding-inline-start: var(--summary-offset-sm);
  }
  @media (width < 768px) {
    padding-inline-start: 0;
  }
}
p {
  margin: 0 0 var(--space-sm-block);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-headings);
  text-transform: uppercase;
}
/* OG's `.summary h2`. */
.parents {
  color: var(--gray-lighter);
  font-size: var(--font-size-summary-h2);
  font-weight: var(--font-weight-headings);
  text-shadow: var(--text-shadow-headings);
  text-transform: none;
}
a {
  color: var(--gray-lighter);
  &:is(:hover, :focus-visible) {
    color: var(--brand-primary);
    text-decoration: none;
  }
}
.year {
  color: var(--gray-light);
  font-size: var(--font-size-header-year);
  font-weight: var(--font-weight-headings-light);
}
</style>
