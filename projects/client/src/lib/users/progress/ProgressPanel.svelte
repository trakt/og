<!--
  An open progress row's panel: the up-next banner (when there's an episode left), then the season picker and the
  chosen season's episode tiles. The picker is a set of toggle buttons, one a season with its count and a bar; it opens
  on up next's season and keeps its choice per row. Each tile links to its episode and says whether it's watched, up
  next, aired or not yet aired. Hovering or focusing a tile shows it in the readout line, and the up-next tile and the
  banner outline each other. The exact watched and left times close it. On a narrow panel the picker wraps above the
  tiles.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import type { ProgressType } from './progressTypes.ts';
import type { ProgressRow } from './toProgressRow.ts';
import type { EpisodeTile, SeasonPicker } from './toSeasonPicker.ts';
import UpNextBanner from './UpNextBanner.svelte';

interface Props {
  picker: SeasonPicker;
  upNext?: ProgressRow['upNext'];
  last?: ProgressRow['last'];
  watchedTime: string;
  leftTime: string;
  type: ProgressType;
}

const { picker, upNext, last, watchedTime, leftTime, type }: Props = $props();

let chosen = $state<number>();
let readout = $state<EpisodeTile>();
let linked = $state(false);

const library = $derived(type === 'library');
const season = $derived(
  picker.seasons.find(({ number }) => number === (chosen ?? picker.selected)) ?? picker.seasons.at(0),
);

function pick(number: number) {
  chosen = number;
  readout = undefined;
}

function show(tile: EpisodeTile, on: boolean) {
  if (on) readout = tile;
  if (tile.state === 'up-next') linked = on;
}
</script>

<!-- Episode pages are OG routes og hasn't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="panel">
  {#if upNext}<UpNextBanner next={upNext} {linked} onlink={(on) => (linked = on)} />{/if}

  {#if season}
    <div class="pane">
      <div class="picker" role="group" aria-label="Seasons">
        {#each picker.seasons as { number, name, count, complete, percent, summary } (number)}
          <button type="button" class="pick" aria-pressed={number === season.number} aria-label="{name}, {summary}"
            onclick={() => pick(number)}>
            <span class="name">{name}</span>
            <span class="count">{#if complete}<span class="done"><Icon svg={check} /></span>{/if}{count}</span>
            <span class="bar"><span style:inline-size="{percent}%"></span></span>
          </button>
        {/each}
      </div>

      <div class="season">
        <p class="heading"><b>{season.name}</b><span class="count">{season.summary}</span></p>
        <ul class="tiles" aria-label="{season.name} episodes">
          {#each season.tiles as tile (tile.code)}
            <li>
              <a class={['tile', tile.state, { linked: linked && tile.state === 'up-next' }]} href={tile.href}
                aria-label={tile.label} onpointerenter={() => show(tile, true)} onpointerleave={() => show(tile, false)}
                onfocus={() => show(tile, true)} onblur={() => show(tile, false)}>
                <b>{tile.number}</b>
                <span class="title">{tile.title ?? tile.code}</span>
                <span class="note">{tile.note}</span>
              </a>
            </li>
          {/each}
        </ul>
        <p class="readout" aria-live="polite">
          {#if readout}<b>{readout.code}</b> {readout.readout}{:else}Hover or focus an episode to see it here.{/if}
        </p>
      </div>
    </div>
  {/if}

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

p,
ul {
  margin: 0;
}

ul {
  padding: 0;
  list-style: none;
}

.pane {
  display: grid;
  grid-template-columns: var(--progress-picker-width) minmax(0, 1fr);
  gap: var(--progress-pane-gap);
  align-items: start;
}

.picker {
  display: grid;
  gap: var(--progress-picker-gap);
}

.pick {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--progress-picker-text-gap);
  padding: var(--progress-picker-padding);
  border: 0;
  border-inline-start: var(--progress-picker-edge) solid transparent;
  background-color: var(--color-progress-seasons-bg);
  color: var(--color-text);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background-color: var(--color-progress-picker-hover);
  }

  &[aria-pressed='true'] {
    border-inline-start-color: var(--brand-primary);
    background-color: var(--color-surface);
    box-shadow: inset 0 0 0 var(--progress-cell-hairline) var(--color-separator);
  }
}

.name {
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings);
}

.bar {
  grid-column: 1 / -1;
  block-size: var(--progress-picker-bar);
  background-color: var(--color-progress-cell);

  & span {
    display: block;
    block-size: 100%;
    background-color: var(--brand-primary);
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

.season {
  display: grid;
  gap: var(--progress-season-gap);
  min-inline-size: 0;
}

.heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--progress-season-heading-gap);
  align-items: baseline;

  & b {
    font-family: var(--font-headings);
    font-size: var(--font-size-progress-season-heading);
    font-weight: var(--font-weight-headings-heavy);
  }
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--progress-tile-min), 1fr));
  gap: var(--progress-tile-gap);

  & li {
    display: grid;
  }
}

.tile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--progress-tile-text-gap);
  align-items: baseline;
  padding: var(--progress-tile-padding);
  border: var(--progress-cell-hairline) solid var(--color-separator);
  background-color: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;

  &:hover {
    border-color: var(--color-text-muted);
  }

  & b {
    grid-row: span 2;
    min-inline-size: var(--progress-tile-number-min);
    color: var(--color-text-muted);
    font-family: var(--font-headings);
    font-size: var(--font-size-progress-tile-number);
    font-weight: var(--font-weight-headings-heavy);
  }

  &.watched {
    background-color: var(--color-progress-seasons-bg);
    box-shadow: inset var(--progress-picker-edge) 0 0 var(--brand-primary);

    & b {
      color: var(--brand-primary);
    }
  }

  &.up-next {
    border-color: var(--brand-primary);
    box-shadow: inset 0 0 0 var(--progress-cell-hairline) var(--brand-primary);
    animation: pulse var(--progress-cell-pulse-duration) ease-out infinite;

    & b,
    & .note {
      color: var(--brand-primary);
    }
  }

  &.not-aired {
    border-style: dashed;
    color: var(--color-text-muted);
  }

  &:focus-visible,
  &.linked {
    position: relative;
    z-index: 1;
    outline: var(--progress-cell-ring) solid var(--color-text);
    outline-offset: var(--progress-cell-hairline);
  }
}

.title {
  overflow: hidden;
  font-size: var(--font-size-progress-tile-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  color: var(--color-text-muted);
  font-size: var(--font-size-progress-tile-note);
}

@keyframes pulse {
  0% {
    box-shadow:
      inset 0 0 0 var(--progress-cell-hairline) var(--brand-primary),
      0 0 0 0 var(--color-progress-cell-pulse);
  }

  70%,
  100% {
    box-shadow:
      inset 0 0 0 var(--progress-cell-hairline) var(--brand-primary),
      0 0 0 var(--progress-cell-pulse) transparent;
  }
}

.readout {
  min-block-size: var(--progress-readout-height);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);

  & b {
    color: var(--color-text);
    font-family: var(--font-headings);
  }
}

.exact {
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

@container progress-panel (width < 760px) {
  .pane {
    grid-template-columns: var(--progress-picker-width-tablet) minmax(0, 1fr);
    gap: var(--progress-pane-gap-tablet);
  }

  .tiles {
    grid-template-columns: repeat(auto-fill, minmax(var(--progress-tile-min-tablet), 1fr));
  }
}

@container progress-panel (width < 480px) {
  .pane {
    grid-template-columns: minmax(0, 1fr);
  }

  .picker {
    grid-template-columns: repeat(auto-fill, minmax(var(--progress-picker-min-phone), 1fr));
  }
}

/* The ring holds still, with a soft halo in place of the pulse. */
@media (prefers-reduced-motion: reduce) {
  .tile.up-next {
    animation: none;
    box-shadow:
      inset 0 0 0 var(--progress-cell-hairline) var(--brand-primary),
      0 0 0 var(--progress-cell-ring) var(--color-progress-cell-still);
  }
}
</style>
