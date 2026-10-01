<!--
  OG's `.frame-wrapper`: a sticky 300px sidebar with the page title, carets to the neighbouring
  pages and an under-title line, next to a dark frame for the grid. The chart and search pages use it. The page title
  is the h1; the fixed header overlaps the top, so both columns start below it.
  `p` or left and `n` or right follow the carets . With `collapsible`, a toggle in the h2 and the `h` key hide the sidebar, remembered for a year in
  OG's `hide_sidenav` cookie. Mousetrap ignored the keys while typing, and so does this.
  `panel` is OG's second sidebar, the advanced filters: a column after the sidebar that opens to 300px while
  `panelOpen`, pushing the grid right and off the page's edge rather than squeezing it.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import caretLeft from '$lib/icons/solid/caret-left.svg?raw';
import caretRight from '$lib/icons/solid/caret-right.svg?raw';
import collapse from '$lib/icons/solid/arrow-down-left-and-arrow-up-right-to-center.svg?raw';
import expand from '$lib/icons/solid/arrow-up-right-and-arrow-down-left-from-center.svg?raw';
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  /** The previous and next page. Left out, that caret doesn't show. */
  prevHref?: string;
  nextHref?: string;
  /** What the carets step through: "Previous page", "Previous week". */
  unit?: string;
  /** Shows the sidebar toggle. OG only gave it to VIPs. */
  collapsible?: boolean;
  /** The sidebar starts hidden: the `hide_sidenav` cookie, read by the loader. */
  sidenavHidden?: boolean;
  /** The filter icons, floated to the title's right . */
  icons?: Snippet;
  /** The h2 under the title. */
  subtitle: Snippet;
  /** The rest of the sidebar, under the subtitle. */
  sidebar?: Snippet;
  /** The advanced filter panel, between the sidebar and the frame. */
  panel?: Snippet;
  panelOpen?: boolean;
  children: Snippet;
}

const {
  title,
  prevHref,
  nextHref,
  unit = 'page',
  collapsible = false,
  sidenavHidden = false,
  icons,
  subtitle,
  sidebar,
  panel,
  panelOpen = false,
  children,
}: Props = $props();

let hidden = $derived(collapsible && sidenavHidden);

function toggle() {
  hidden = !hidden;
  document.cookie = `hide_sidenav=true; path=/; samesite=lax; max-age=${hidden ? 31_536_000 : 0}`;
}

function onkeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;

  const href = event.key === 'p' || event.key === 'ArrowLeft'
    ? prevHref
    : event.key === 'n' || event.key === 'ArrowRight'
    ? nextHref
    : undefined;
  if (href) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- the hrefs come in built
    goto(href);
  } else if (event.key === 'h' && collapsible) {
    toggle();
  } else {
    return;
  }

  event.preventDefault();
}
</script>

<!-- The hrefs keep the current path and query, so resolve() has nothing to add. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:window {onkeydown} />

<div class={['frame-wrapper', { hidden, 'has-panel': panel, 'panel-open': panel && panelOpen }]}>
  <div class="sidenav">
    <div class="sidenav-inner">
      <!-- OG put the icons inside the h1. Before it, they float to the same spot and stay out of its name. -->
      {#if icons}<div class="icons">{@render icons()}</div>{/if}
      <!-- No whitespace around the title: OG's carets sit tight against it. -->
      <h1 class:single-line={unit === 'week'}>
        {#if prevHref}<Tooltip text="Previous {unit}">
            {#snippet trigger(tooltip)}<a class="prev" href={prevHref} rel="prev" {...tooltip}
                ><Icon svg={caretLeft} label="Previous {unit}" /></a
              >{/snippet}
          </Tooltip>{/if}{title}{#if nextHref}<Tooltip text="Next {unit}">
            {#snippet trigger(tooltip)}<a class="next" href={nextHref} rel="next" {...tooltip}
                ><Icon svg={caretRight} label="Next {unit}" /></a
              >{/snippet}
          </Tooltip>{/if}
      </h1>
      <h2>
        {#if collapsible}
          <button type="button" class="toggle" title="Toggle sidebar" aria-expanded={!hidden} onclick={toggle}>
            <Icon svg={hidden ? expand : collapse} label="Toggle sidebar" />
          </button>
        {/if}
        {@render subtitle()}
      </h2>
      {@render sidebar?.()}
    </div>
  </div>
  {#if panel}
    <div class="panel">{@render panel()}</div>
  {/if}
  <div class="frame">
    {@render children()}
  </div>
</div>

<style>
.frame-wrapper {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background-color: var(--color-frame);
  color: var(--color-frame-text);

  @media (min-width: 768px) {
    grid-template-columns: var(--sidenav-width) minmax(0, 1fr);

    &.has-panel {
      grid-template-columns: var(--sidenav-width) 0 minmax(0, 1fr);
      overflow-x: clip;
    }

    &.panel-open {
      grid-template-columns: var(--sidenav-width) var(--sidenav-width) minmax(0, 1fr);
    }
  }
}

.panel {
  min-inline-size: 0;
}

.sidenav-inner {
  padding: calc(var(--header-height) + var(--sidenav-offset)) var(--gutter) var(--gutter);

  @media (min-width: 768px) {
    position: sticky;
    inset-block-start: 0;
  }
}

.frame {
  min-inline-size: 0;

  @media (min-width: 768px) {
    min-block-size: calc(100vh - var(--header-height));
    margin-block-start: var(--header-height);
    border-inline-start: 1px solid var(--color-frame-border);

    /* The grid keeps its width and runs off the right edge, like OG's `.frame.with-advanced-filters`. */
    .panel-open & {
      margin-inline-end: calc(-1 * var(--sidenav-width));
    }
  }
}

h1 {
  position: relative;
  margin: 0;
}

h1.single-line {
  white-space: nowrap;
}

/* Over the h1, which is positioned for the carets and would otherwise take the clicks. OG's margin was 10px; the
   buttons' taller line box eats 3px of it. */
.icons {
  position: relative;
  z-index: 1;
  float: inline-end;
  margin-block-start: 7px;
}

.prev,
.next {
  font-size: var(--font-size-icon-lg);
}

/* In the sidebar's left padding, with a wide hit area that runs under the title. */
.prev {
  position: absolute;
  inset-block-end: 4px;
  inset-inline-start: calc(-1 * var(--gutter));
  padding-inline: 7px var(--gutter);
}

.next {
  display: inline-block;
  margin-inline-start: -3px;
  padding-inline: 10px;
}

h2 {
  position: relative;
  margin: var(--space-sm-block) 0 0;
  font-size: var(--font-size-sidenav-subtitle);
}

/* OG's .sidenav-collapse: a tab hanging off the sidebar's left edge, or its right edge once the sidebar is hidden. */
.toggle {
  display: none;
  position: absolute;
  inset-block-start: -7px;
  inset-inline-start: -21px;
  z-index: 1;
  inline-size: 22px;
  min-block-size: 0;
  padding: 0 0 0 5px;
  border: 0;
  border-radius: 0 5px 5px 0;
  background: none;
  color: var(--color-frame-toggle);
  font-size: var(--font-size-small);
  line-height: 30px;
  cursor: pointer;

  &:hover {
    color: var(--color-frame-text);
  }

  @media (min-width: 768px) {
    display: block;
  }

  .hidden & {
    inset-inline: auto -44px;
    background-color: var(--color-frame);
  }
}

/* Hidden, the sidebar's track closes and the sidebar slides out left of it, leaving the toggle's tab showing. */
@media (min-width: 768px) {
  .sidenav {
    inline-size: var(--sidenav-width);

    .hidden & {
      margin-inline-start: calc(-1 * var(--sidenav-width));
    }
  }

  .frame-wrapper.hidden {
    grid-template-columns: 0 minmax(0, 1fr);

    &.has-panel {
      grid-template-columns: 0 0 minmax(0, 1fr);
    }

    &.panel-open {
      grid-template-columns: 0 var(--sidenav-width) minmax(0, 1fr);
    }
  }

  /* Over the frame, so the toggle's tab stays clickable. */
  .hidden .sidenav-inner {
    z-index: 1;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .frame-wrapper,
  .sidenav,
  .frame {
    transition-duration: var(--transition-frame);
    transition-property: grid-template-columns, margin-inline-start, margin-inline-end;
  }

  .toggle {
    transition: color var(--transition-frame);
  }
}
</style>
