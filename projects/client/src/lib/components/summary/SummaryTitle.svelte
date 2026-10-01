<!--
  The title block pinned to the bottom of a summary's fanart: an optional parent line above (the movie's collection,
  the episode's show and season), then the h1 with the year in a lighter span and the certification pill.
  Render it as FanartHeader's children.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import { certificationTip } from './certificationTip.ts';

interface Props {
  title: string;
  /** A year, or a range like "2008 - 2010". */
  year?: number | string | null;
  certification?: string | null;
  /** The line above the title, linking up a level. */
  parent?: { readonly href: string; readonly title: string };
}

const { title, year, certification, parent }: Props = $props();
</script>

<!-- Hrefs come in as props, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="summary-title">
  {#if parent}
    <p class="parent"><a href={parent.href} rel="up">{parent.title}</a></p>
  {/if}
  <h1>
    {title}
    {#if year}<span class="year">{year}</span>{/if}
    {#if certification}
      <Tooltip text={certificationTip(certification)}>
        {#snippet trigger(tooltip)}
          <span class="certification" {...tooltip}>{certification}</span>
        {/snippet}
      </Tooltip>
    {/if}
  </h1>
</div>

<style>
.summary-title {
  padding-inline-start: var(--summary-offset);

  @media (width < 992px) {
    padding-inline-start: var(--summary-offset-sm);
  }

  @media (width < 768px) {
    padding-inline-start: 0;
  }
}

/* OG's h2 above the title. It's a paragraph here so the page's first heading is the h1. */
.parent {
  margin: 0 0 5px;
  font-family: var(--font-headings);
  font-size: var(--font-size-summary-h2);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  text-shadow: var(--text-shadow-headings);

  & a {
    color: var(--gray-lighter);
    text-decoration: none;
    transition: color var(--transition-card);

    &:is(:hover, :focus-visible) {
      color: var(--brand-primary);
      text-decoration: none;
    }
  }
}

.year {
  font-size: var(--font-size-header-year);
  font-weight: var(--font-weight-headings-light);
  color: var(--gray-light);
}

.certification {
  display: inline-block;
  margin-inline-start: 10px;
  padding: 2px 4px 1px;
  border: 1px solid var(--color-card-text);
  border-radius: var(--radius-certification);
  font-size: var(--font-size-small);
  line-height: var(--line-height-base);
  vertical-align: middle;
  text-shadow: none;
  cursor: pointer;
  transition: all var(--transition-card);

  &:hover {
    background-color: var(--color-card-text);
    color: var(--color-page);
  }
}
</style>
