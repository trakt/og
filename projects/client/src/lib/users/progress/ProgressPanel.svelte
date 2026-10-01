<!--
  An open progress row's panel: the up-next banner (when there's an episode left), then the fitted season strips, one
  row a season and one cell an episode, all on the longest season's columns. A ruler under them marks every fifth
  episode and the up-next column. Each season row is one tab stop: the arrows move within it, up and down to the
  same episode in the next season, Home and End to its ends. Hovering or focusing a cell shows it in the readout line,
  and the up-next cell and the banner outline each other. A legend and the exact watched and left times close it.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import type { ProgressType } from './progressTypes.ts';
import { roveCell } from './roveCell.ts';
import type { ProgressRow } from './toProgressRow.ts';
import type { ProgressStrips, StripCell } from './toProgressStrips.ts';
import UpNextBanner from './UpNextBanner.svelte';

interface Props {
  strips: ProgressStrips;
  upNext?: ProgressRow['upNext'];
  last?: ProgressRow['last'];
  watchedTime: string;
  leftTime: string;
  type: ProgressType;
}

const { strips, upNext, last, watchedTime, leftTime, type }: Props = $props();

let grid = $state<HTMLElement>();
let readout = $state<StripCell>();
let linked = $state(false);
// Each season row's tab stop, once the keyboard has moved it.
let moved = $state<Record<number, number>>({});

const library = $derived(type === 'library');
const lengths = $derived(strips.seasons.map(({ cells }) => cells.length));
const stop = (row: number) =>
  moved[row] ?? Math.max(strips.seasons.at(row)?.cells.findIndex(({ state }) => state === 'up-next') ?? 0, 0);

function show(cell: StripCell, on: boolean) {
  if (on) readout = cell;
  if (cell.state === 'up-next') linked = on;
}

function rove(event: KeyboardEvent, row: number, index: number) {
  const to = roveCell({ key: event.key, row, index, lengths });
  if (!to) return;
  event.preventDefault();
  moved = { ...moved, [to.row]: to.index };
  grid?.querySelectorAll('ul').item(to.row)?.querySelectorAll('a').item(to.index)?.focus();
}

const legend = $derived([
  { state: 'watched', text: library ? 'in library' : 'watched' },
  { state: 'not-watched', text: library ? 'not in library' : 'not watched' },
  { state: 'up-next', text: 'up next' },
  { state: 'not-aired', text: 'not aired' },
]);
</script>

<!-- Episode pages are OG routes og hasn't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="panel">
  {#if upNext}<UpNextBanner next={upNext} {linked} onlink={(on) => (linked = on)} />{/if}

  <div class="strips" bind:this={grid} style:--columns={strips.columns}>
    {#each strips.seasons as season, row (season.number)}
      <div class="strip">
        <span class="label" aria-hidden="true">{season.label}</span>
        <ul class="cells" aria-label={season.name}>
          {#each season.cells as cell, index (cell.code)}
            <li>
              <a class={['cell', cell.state, { linked: linked && cell.state === 'up-next' }]} href={cell.href}
                aria-label={cell.label} tabindex={stop(row) === index ? 0 : -1} onkeydown={(event) => rove(event, row, index)}
                onpointerenter={() => show(cell, true)} onpointerleave={() => show(cell, false)}
                onfocus={() => show(cell, true)} onblur={() => show(cell, false)}></a>
            </li>
          {/each}
        </ul>
        <span class="count">{#if season.complete}<span class="done"><Icon svg={check} /></span>{/if}{season.count}</span>
      </div>
    {/each}
    <div class="strip" aria-hidden="true">
      <span></span>
      <div class="ticks">
        {#each strips.ticks as tick, index (index)}<span class={{ mark: tick.mark }}>{tick.text}</span>{/each}
      </div>
    </div>
  </div>

  <p class="readout" aria-live="polite">
    {#if readout}<b>{readout.code}</b>{readout.label.slice(readout.code.length)}{:else}Hover or focus an episode to see it
      here.{/if}
  </p>

  <ul class="legend" aria-label="Legend">
    {#each legend as { state, text } (state)}<li><span class={['swatch', state]}></span>{text}</li>{/each}
  </ul>

  {#if last?.number || !library}
    <p class="exact">
      {#if last?.number}{library ? 'Last added' : 'Last watched'} {last.number}{last.title ? ` ${last.title}` : ''}{/if}
      {#if !library}{last?.number ? '· ' : ''}{watchedTime} watched, {leftTime} left{/if}
    </p>
  {/if}
</div>

<style>
.panel {
  container: progress-panel / inline-size;
  display: grid;
  gap: var(--progress-panel-gap);
  margin-block-start: var(--progress-panel-gap);
  font-size: var(--font-size-progress-row);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.strips {
  display: grid;
  gap: var(--progress-strip-row-gap);
  min-inline-size: 0;
}

.strip {
  display: grid;
  grid-template-columns:
    var(--progress-strip-label)
    minmax(0, calc(var(--columns) * var(--progress-strip-column)))
    var(--progress-strip-count);
  gap: var(--progress-strip-gap);
  align-items: center;
  justify-content: start;
}

.label {
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings);
}

.cells,
.ticks {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  gap: var(--progress-cell-gap);

  & > :nth-child(5n) {
    margin-inline-end: var(--progress-cell-group-gap);
  }
}

.cells li {
  display: flex;
}

.cell {
  flex: 1;
  block-size: var(--progress-cell-height);
  background-color: var(--color-progress-cell);

  &.watched {
    background-color: var(--brand-primary);
  }

  &.up-next {
    background-color: var(--color-surface);
    box-shadow: inset 0 0 0 var(--progress-cell-ring) var(--brand-primary);
    animation: pulse var(--progress-cell-pulse-duration) ease-out infinite;
  }

  &.not-aired {
    background: none;
    box-shadow: inset 0 0 0 var(--progress-cell-hairline) var(--color-progress-cell-unaired);
  }

  &:focus-visible,
  &.linked {
    position: relative;
    z-index: 1;
    outline: var(--progress-cell-ring) solid var(--color-text);
    outline-offset: var(--progress-cell-hairline);
  }
}

@keyframes pulse {
  0% {
    box-shadow:
      inset 0 0 0 var(--progress-cell-ring) var(--brand-primary),
      0 0 0 0 var(--color-progress-cell-pulse);
  }

  70%,
  100% {
    box-shadow:
      inset 0 0 0 var(--progress-cell-ring) var(--brand-primary),
      0 0 0 var(--progress-cell-pulse) transparent;
  }
}

.count {
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.done {
  margin-inline-end: var(--progress-inline-gap);
  color: var(--color-progress-episode-done);
}

.ticks {
  color: var(--color-text-muted);
  font-family: var(--font-headings);
  font-size: var(--font-size-progress-tick);
  font-variant-numeric: tabular-nums;

  & span {
    white-space: nowrap;
  }

  & .mark {
    color: var(--brand-primary);
    font-weight: var(--font-weight-headings-heavy);
  }
}

.readout {
  min-block-size: var(--progress-readout-height);
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-progress-readout);

  & b {
    margin-inline-end: var(--progress-inline-gap);
    color: var(--color-text);
    font-family: var(--font-headings);
  }
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--progress-legend-gap);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.swatch {
  display: inline-block;
  inline-size: var(--progress-legend-swatch);
  block-size: var(--progress-legend-swatch);
  margin-inline-end: var(--progress-legend-swatch-gap);
  vertical-align: middle;

  /* The cells' states, held still. */
  &.watched {
    background-color: var(--brand-primary);
  }

  &.not-watched {
    background-color: var(--color-progress-cell);
  }

  &.up-next {
    box-shadow: inset 0 0 0 var(--progress-cell-ring) var(--brand-primary);
  }

  &.not-aired {
    box-shadow: inset 0 0 0 var(--progress-cell-hairline) var(--color-progress-cell-unaired);
  }
}

.exact {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

@container progress-panel (width < 640px) {
  .strip {
    grid-template-columns: var(--progress-strip-label-phone) minmax(0, 1fr);
    row-gap: var(--progress-cell-gap);
  }

  .count {
    grid-column: 2;
  }
}

/* The ring holds still, with a soft halo in place of the pulse. */
@media (prefers-reduced-motion: reduce) {
  .cell.up-next {
    animation: none;
    box-shadow:
      inset 0 0 0 var(--progress-cell-ring) var(--brand-primary),
      0 0 0 var(--progress-cell-ring) var(--color-progress-cell-still);
  }
}
</style>
