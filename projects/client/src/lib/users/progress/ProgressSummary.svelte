<!--
  The summary strip on the right of the progress subnav: on Watched, the percent
  watched with "133/154 episodes" under it on hover and the time left with its episode count; on Library, the
  percent in your library. Then the show count. Until the rows are computed the strip keeps to the show count. The
  time left reads "~" while it's an estimate from show runtimes.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check.svg?raw';
import collection from '$lib/icons/trakt/collection.svg?raw';
import documentIcon from '$lib/icons/trakt/document.svg?raw';
import timePlay from '$lib/icons/trakt/time-play.svg?raw';
import { formatRuntime } from '$lib/utils/formatRuntime';
import type { ProgressTotals } from './ProgressTotals.ts';
import type { ProgressType } from './progressTypes.ts';

interface Props {
  type: ProgressType;
  /** Every show on every page. */
  shows: number;
  totals: ProgressTotals | null;
}

const { type, shows, totals }: Props = $props();

const number = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;
</script>

{#snippet stat(label: string, svg: string, value: string, under: string, kind = '')}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <!-- A focus stop so the tooltip and the count under it show from the keyboard too. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <span class={['stat', kind]} tabindex="0" {...tooltip}>
        <span class="icon-slot"><Icon {svg} /></span><span class="text-wrapper"><span class="hidden">{label}
          </span>{value}<span class="under-count">{under}</span></span>
      </span>
    {/snippet}
  </Tooltip>
{/snippet}

<div class="progress-summary">
  {#if totals}
    {#if type === 'watched'}
      {@render stat('Watched', check, `${totals.percent}%`,
        `${number(totals.completed)}/${number(totals.aired)} ${plural(totals.aired, 'episode')}`, 'watched')}
      {@render stat('Time left to watch', timePlay, `${totals.exact ? '' : '~'}${formatRuntime(totals.minutesLeft)}`,
        `${number(totals.left)} ${plural(totals.left, 'episode')}`, 'time')}
    {:else}
      {@render stat('Added to Library', collection, `${totals.percent} %`,
        `${number(totals.completed)}/${number(totals.aired)} ${plural(totals.aired, 'episode')}`, 'library')}
    {/if}
  {/if}
  <Tooltip text={plural(shows, 'Show')}>
    {#snippet trigger(tooltip)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <span class="stat shows" tabindex="0" {...tooltip}>
        <span class="icon-slot"><Icon svg={documentIcon} /></span>{number(shows)} {plural(shows, 'show')}
      </span>
    {/snippet}
  </Tooltip>
</div>

<style>
/* `.comment-wrapper.interactions` with `a.alt`. */
.progress-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--list-row-action-gap);
  min-inline-size: 0;
  color: var(--brand-secondary);
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  text-transform: uppercase;
  white-space: nowrap;
}

.stat {
  color: inherit;
}

.icon-slot {
  display: inline-block;
  margin-inline-end: 5px;
  font-size: var(--font-size-list-row-action);
  line-height: 1;
  vertical-align: top;
}

/* OG's document and collection glyphs were a size down. */
.shows .icon-slot,
.library .icon-slot {
  font-size: var(--font-size-history-count-icon);
}

.time .text-wrapper {
  text-transform: none;
}

.text-wrapper {
  display: inline-block;
  position: relative;
}

.under-count {
  position: absolute;
  inset-block-end: var(--list-stat-under-offset);
  inset-inline-start: 0;
  color: var(--color-list-stat-under);
  font-size: var(--font-size-list-stat-under);
  text-transform: none;
  opacity: 0;
  transition: opacity 0.5s;

  .stat:is(:hover, :focus-visible) & {
    opacity: 1;
  }
}

.hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .under-count {
    transition: none;
  }
}
</style>
