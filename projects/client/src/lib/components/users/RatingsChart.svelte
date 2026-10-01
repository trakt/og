<!--
  OG's profile ratings chart (users.js:416-490, a Chart.js bar chart): ratings 1 to 10 as gray bars on a bare axis,
  the most rated one picked out. Hovering a bar shows "43 ratings" and "8 — Great" above it, and clicking it opens
  the ratings page at that rating. og draws it with HTML: each bar is a link named by its rating and count, so it
  works with the keyboard and a screen reader (OG's canvas had no text alternative).
-->
<script lang="ts">
import type { RatingBar } from '$lib/users/profile/toRatingsChart';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import { countLabel } from '$lib/utils/countLabel';

const { bars, slug, media = false }: { bars: readonly RatingBar[]; slug?: string; media?: boolean } = $props();
</script>

<!-- The ratings page isn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class={["ratings-chart", { media }]}>
  <ol class="plot" aria-label={media ? "Votes by rating" : "Ratings distribution"}>
    {#each bars as bar (bar.rating)}
      <li class="column" style:--height="{bar.height}%" style:--fraction={bar.height / 100}>
        {#if media}
          <Tooltip variant="chart">
            {#snippet trigger(tooltip)}
              <button class="bar-link" type="button" aria-label="{bar.label}: {countLabel(bar.count, 'vote')}" {...tooltip}>
                <span class={['bar', { top: bar.top, empty: bar.count === 0 }]}></span>
              </button>
            {/snippet}
            <span class="stat">{countLabel(bar.count, 'vote')}</span>
            <span class="rating">{bar.label}</span>
          </Tooltip>
        {:else}
          <a
            class="bar-link"
            href="/users/{slug}/ratings/all/{bar.rating}"
            aria-label="{bar.label}: {countLabel(bar.count, 'rating')}"
          >
            <span class={['bar', { top: bar.top }]}></span>
            <span class="tip" aria-hidden="true">
              <span class="stat">{countLabel(bar.count, 'rating')}</span>
              <span class="rating">{bar.label}</span>
            </span>
          </a>
        {/if}
        <span class="axis-label" aria-hidden="true">{bar.rating}</span>
      </li>
    {/each}
  </ol>
</div>

<style>
.ratings-chart {
  block-size: var(--ratings-chart-height);
  /* OG's canvas ran into the container's padding. */
  margin-inline: calc(var(--gutter) / -2);
  padding: var(--ratings-plot-inset);

  &.media {
    block-size: var(--media-ratings-chart-height);
    margin-inline: 0;
    padding: var(--media-ratings-plot-inset);
    --ratings-plot-height: var(--media-ratings-plot-height);
    & .plot {
      box-sizing: content-box;
    }
  }
}

.plot {
  position: relative;
  display: flex;
  block-size: var(--ratings-plot-height);
  margin: 0;
  padding: 0;
  border-block-end: 1px solid var(--color-chart-axis);
  border-inline-start: 1px solid var(--color-chart-axis);
  list-style: none;

  /* The y axis's five steps, ticked on its outside. */
  &::before {
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc(-1 * var(--chart-tick) - 1px);
    inline-size: var(--chart-tick);
    background: repeating-linear-gradient(to bottom, var(--color-chart-axis) 0 1px, transparent 1px 20%);
  }
}

.column {
  position: relative;
  flex: 1;

  /* A tick under the axis between bars, and at both ends. */
  &::before,
  &:last-child::after {
    content: '';
    position: absolute;
    inset-block-start: calc(100% + 1px);
    inset-inline-start: -1px;
    inline-size: 1px;
    block-size: var(--chart-tick);
    background-color: var(--color-chart-axis);
  }

  &:last-child::after {
    inset-inline: auto 0;
  }
}

.bar-link {
  display: flex;
  align-items: end;
  block-size: 100%;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0 var(--ratings-bar-spacing);
  border: 0;
  background: none;

  .media & {
    position: absolute;
    inset-block-end: 0;
    block-size: max(var(--height), var(--media-ratings-hit-height));
    cursor: help;

    & .bar:not(.empty) {
      block-size: calc(var(--ratings-plot-height) * var(--fraction));
    }
  }
}

.bar {
  inline-size: 100%;
  block-size: var(--height);
  background-color: var(--color-ratings-bar);

  &.empty {
    block-size: 0;
  }

  &.top {
    background-color: var(--color-ratings-bar-top);
  }

  .bar-link:is(:hover, :focus-visible) & {
    background-color: var(--color-ratings-bar-hover);
  }
}

/* OG's `.chart-tooltip.above`. */
.tip {
  position: absolute;
  z-index: 1;
  inset-block-end: calc(var(--height) + var(--chart-tooltip-offset));
  inset-inline-start: 50%;
  translate: -50% 0;
  padding: var(--space-chart-tooltip);
  border: 1px solid var(--color-chart-tooltip-border);
  border-radius: var(--radius-chart-tooltip);
  background: var(--color-chart-tooltip-bg);
  color: var(--color-chart-tooltip-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-chart);

  .bar-link:is(:hover, :focus-visible) & {
    opacity: 1;
  }
}

.stat,
.rating {
  display: block;
}

.stat {
  font-size: var(--font-size-chart-tooltip);
}

.rating {
  color: var(--color-chart-tooltip-muted);
  font-size: var(--font-size-chart-tooltip-small);
}

.axis-label {
  position: absolute;
  inset-block-start: calc(100% + var(--chart-tick) + var(--chart-axis-label-gap));
  inset-inline: 0;
  color: var(--color-chart-axis-label);
  font-family: var(--font-chart);
  font-size: var(--font-size-chart-axis);
  line-height: 1;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .tip {
    transition: none;
  }
}
</style>
