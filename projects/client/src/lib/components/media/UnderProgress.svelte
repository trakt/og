<!--
  OG's thin progress bar under a poster's quick icons,
  as a link to the progress page with OG's progress tooltip below it. With `ticks`, OG's exact bar: one segment per
  aired episode, filled where it's watched. Without, the standard bar, which fills the watched share from the left.
  The link's name carries every tooltip line, so nothing lives only in the tooltip.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import type { ProgressTooltipLine } from './ProgressTooltipLine.ts';

interface Props {
  href: string;
  /** 0 to 100. */
  percent: number;
  /** Each aired episode, true when watched, for OG's exact bar (`.progress.ticks`). */
  ticks?: readonly boolean[];
  /** Tooltip lines, in groups. A rewatch has a second group for the whole show, under a divider. */
  lines: readonly (readonly ProgressTooltipLine[])[];
}

const { href, percent, ticks, lines }: Props = $props();

const spoken = ({ text, detail }: ProgressTooltipLine) => (detail ? `${text} (${detail})` : text);
const label = $derived(lines.map((group) => group.map(spoken).join(', ')).join('; '));
</script>

<!-- The progress page isn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<Tooltip placement="bottom">
  {#snippet trigger(tooltip)}
    <a class="under-progress" {href} aria-label={label} {...tooltip}>
      <span class={['track', { full: percent >= 100, ticks: Boolean(ticks) }]}>
        {#if ticks}
          {#each ticks as watched, i (i)}
            <span class={['tick', { watched }]}></span>
          {/each}
        {:else}
          <span class="fill" style:inline-size="{percent}%"></span>
        {/if}
      </span>
    </a>
  {/snippet}
  {#each lines as group, i (i)}
    {#if i > 0}<span class="divider"></span>{/if}
    {#each group as line, j (j)}
      <span class={['line', { muted: line.muted }]}>
        {line.text}{#if line.detail}<em>{` (${line.detail})`}</em>{/if}
      </span>
    {/each}
  {/each}
</Tooltip>

<style>
.under-progress {
  display: block;
  block-size: var(--progress-under-height);

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

.track {
  display: block;
  block-size: 100%;
  background-color: var(--progress-under-bg);

  /* OG's `.progress[aria-valuenow="100"]`. */
  &.full {
    background-color: var(--progress-bar);
  }
}

/* OG's ticks share the bar evenly; an unwatched one lets the track show through. */
.ticks {
  display: flex;
}

.tick {
  flex: 1;
  transition: background-color var(--transition-card);

  &.watched {
    background-color: var(--progress-bar);
  }
}

.fill {
  display: block;
  block-size: 100%;
  background-color: var(--progress-bar);
  transition: inline-size var(--transition-card);
}

.line {
  display: block;
}

/* OG's `.collection-metadata` inside a tooltip. */
.muted {
  color: var(--color-tooltip-muted);
}

/* OG's `.tooltip-hr` between a rewatch and the whole show. */
.divider {
  display: block;
  margin-block: var(--space-tooltip-divider);
  border-block-end: 1px solid var(--color-tooltip-divider);
}

@media (prefers-reduced-motion: reduce) {
  .fill,
  .tick {
    transition: none;
  }
}
</style>
