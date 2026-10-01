<!--
  The Last 30 Days minutes chart: one gray bar a day, labelled
  with the day of the month, on a bare axis with faint grid lines. Hovering or focusing a bar shows the time watched,
  the day and what was played, and clicking it opens that day's history. og draws it with HTML: each bar is a link
  named by its day, time and plays, so it works with the keyboard and a screen reader (OG's canvas had no text
  alternative). A day with nothing watched has no bar to hover, as in OG, and only a hidden label.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import type { MinutesDay } from '$lib/dashboard/LastThirtyDays';

const { days }: { days: readonly MinutesDay[] } = $props();

const name = (day: MinutesDay) => [`${day.label}: ${day.time} watched`, ...day.counts].join(', ');
</script>

<!-- The history page is a route, but resolve() can't take its query string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="minutes-chart">
  <ol class="plot" aria-label="Time watched each day">
    {#each days as day (day.date)}
      <li class="column" style:--height="{day.height}%" style:--fraction={day.height / 100}>
        {#if day.minutes > 0}
          <Tooltip variant="chart">
            {#snippet trigger(tooltip)}
              <a class="bar-link" href={day.href} aria-label={name(day)} {...tooltip}><span class="bar"></span></a>
            {/snippet}
            <span class="stat">{day.time}</span>
            <span class="line">{day.label}</span>
            <span class="line">
              {#each day.counts as count (count)}<span class="count">{count}</span>{/each}
            </span>
          </Tooltip>
        {:else}
          <span class="hidden-label">{day.label}: nothing watched</span>
        {/if}
        <span class="axis-label" aria-hidden="true">{day.day}</span>
      </li>
    {/each}
  </ol>
</div>

<style>
.minutes-chart {
  container-type: inline-size;
  block-size: var(--minutes-chart-height);
  padding-block-start: var(--minutes-plot-top);
  /* OG's tooltip sat closer to its bar than the ratings chart's. */
  --chart-tooltip-offset: var(--minutes-tooltip-offset);
}

.plot {
  position: relative;
  display: flex;
  block-size: var(--minutes-plot-height);
  box-sizing: content-box;
  margin-block: 0;
  margin-inline: var(--minutes-plot-inline);
  padding: 0;
  border-block-end: 1px solid var(--color-chart-axis);
  border-inline-start: 1px solid var(--color-chart-axis);
  list-style: none;
  /* The five steps: faint grid lines across the plot, and ticks outside the y axis. */
  background: repeating-linear-gradient(to bottom, var(--color-chart-grid) 0 1px, transparent 1px 20%);

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
  min-inline-size: 0;

  /* A tick under the axis between days, and at both ends. */
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
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  display: flex;
  align-items: end;
  /* A short day still gets something to hover. */
  block-size: max(var(--height), var(--minutes-bar-hit-height));
  padding: 0 var(--minutes-bar-spacing);
}

.bar {
  inline-size: 100%;
  block-size: calc(var(--minutes-plot-height) * var(--fraction));
  background-color: var(--color-minutes-bar);

  .bar-link:is(:hover, :focus-visible) & {
    background-color: var(--color-minutes-bar-hover);
  }
}

.stat,
.line,
.count {
  display: block;
}

.stat {
  font-size: var(--font-size-chart-tooltip);
}

.line {
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

/* Too narrow for 30 labels: every other day keeps its number. */
@container (inline-size < 600px) {
  .column:nth-child(even) .axis-label {
    visibility: hidden;
  }
}

.hidden-label {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
