<!--
  OG's progress bar with ticks: one tick per
  aired episode, lit once it's done, and the percent in the last grid column. `simple` is the "Simple Progress
  Bars" setting, which drew the done share as one fill from the left. `size="season"` is the thin bar under a
  season on the progress page.
    <TickBar runs={[{ done: true, count: 8 }, { done: false, count: 2 }]} percent={80} label="Breaking Bad" />
-->
<script lang="ts">
import type { TickRun } from './TickRun.ts';

interface Props {
  runs: readonly TickRun[];
  /** 0 to 100, OG's floor of the done share. */
  percent: number;
  /** Names the bar: OG left it unlabelled. */
  label: string;
  simple?: boolean;
  size?: 'show' | 'season';
}

const { runs, percent, label, simple = false, size = 'show' }: Props = $props();

const total = $derived(runs.reduce((sum, run) => sum + run.count, 0));
const done = $derived(runs.reduce((sum, run) => sum + (run.done ? run.count : 0), 0));
</script>

<div class={['tick-bar', size]}>
  <div
    class={['track', { full: percent >= 100, simple }]}
    role="progressbar"
    aria-label={label}
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    {#if simple}
      <span class="tick done" style:inline-size="{total > 0 ? (done / total) * 100 : 0}%"></span>
    {:else}
      {#each runs as run, i (i)}
        <span class={['tick', { done: run.done }]} style:flex-grow={run.count}></span>
      {/each}
    {/if}
  </div>
  <span class="percent" aria-hidden="true">{percent}%</span>
</div>

<style>
/* OG's `.col-xs-11` bar and `.col-xs-1.percentage` inside the row's 12 columns. */
.tick-bar {
  display: grid;
  grid-template-columns: calc((100% + var(--gutter)) * 11 / 12 - var(--gutter)) 1fr;
  align-items: start;
  column-gap: var(--tick-bar-percent-gap);
}

.track {
  display: flex;
  block-size: var(--tick-bar-height);
  margin-block: var(--tick-bar-margin);
  overflow: hidden;
  background-color: var(--progress-under-bg);

  /* OG's `.progress[aria-valuenow="100"]`. */
  &.full {
    background-color: var(--progress-bar);
  }
}

.tick {
  flex: 1 1 0;
  background-color: var(--progress-under-bg);
  transition: flex-grow var(--transition-tick-bar);

  &.done {
    background-color: var(--progress-bar);
  }
}

/* Simple bars fill the done share from the left of an empty track. */
.simple .tick {
  flex: none;
}

.percent {
  font-family: var(--font-headings);
  font-size: var(--font-size-tick-bar-percent);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-tick-bar-percent);
  white-space: nowrap;
}

.season {
  --tick-bar-height: var(--tick-bar-height-season);
  --tick-bar-margin: 0;
  --font-size-tick-bar-percent: var(--font-size-tick-bar-percent-season);
  --line-height-tick-bar-percent: 1;

  & .percent {
    margin-block-start: var(--tick-bar-percent-season-nudge);
  }
}

/* On a phone the percent keeps its own width instead of a twelfth. */
@media (width < 768px) {
  .tick-bar {
    grid-template-columns: 1fr auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tick {
    transition: none;
  }
}
</style>
