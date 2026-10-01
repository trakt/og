<!--
  The dashboard's Last 30 Days panel: the time, episodes and movies
  watched in the help line, the minutes-per-day chart and the genre bars. With nothing watched OG hid the chart, and
  the whole panel when the genres were empty too. Pass the unawaited `fetchLastThirtyDays` promise from the loader, so
  the page streams in and this panel spins until it lands, and fails on its own if it doesn't.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import GenreBars from '$lib/components/users/GenreBars.svelte';
import type { LastThirtyDays, WatchedCount } from '$lib/dashboard/LastThirtyDays';
import chartSimple from '$lib/icons/thin/chart-simple.svg?raw';
import DashboardPanel from './DashboardPanel.svelte';
import MinutesChart from './MinutesChart.svelte';

const { stats }: { stats: Promise<LastThirtyDays> } = $props();
</script>

{#snippet panel(loading: boolean, content: Snippet, help?: Snippet)}
  <DashboardPanel --panel-padding-end="0" title="Last 30 Days" icon={chartSimple} {loading} {help}>
    {@render content()}
  </DashboardPanel>
{/snippet}

{#snippet count({ count, word, plays }: WatchedCount)}
  <span class="part"><b>{count}</b>&nbsp;{word}{#if plays}&nbsp;<span class="plays">{plays}</span>{/if}</span>
{/snippet}

{#await stats}
  {@render panel(true, pending, zero)}
{:then last}
  {#if last.days.length > 0 || last.genres.length > 0}
    {#snippet totals()}
      <span class="totals">
        <span class="part"><b>{last.time}</b>&nbsp;watched</span>
        {@render count(last.episodes)}
        {@render count(last.movies)}
      </span>
    {/snippet}
    {#snippet charts()}
      <div class="charts">
        {#if last.days.length > 0}
          <div class="block"><MinutesChart days={last.days} /></div>
        {/if}
        {#if last.genres.length > 0}
          <div class="block genres"><GenreBars genres={last.genres} /></div>
        {/if}
      </div>
    {/snippet}
    {@render panel(false, charts, totals)}
  {/if}
{:catch}
  {@render panel(false, failed)}
{/await}

<!-- OG's placeholder help line until the chart's numbers came in. -->
{#snippet zero()}
  <span class="totals">
  <span class="part"><b>0 min</b>&nbsp;watched</span>
  <span class="part">0 episodes</span>
  <span class="part">0 movies</span>
</span>
{/snippet}

{#snippet pending()}{/snippet}

{#snippet failed()}
  <div class="notice">
  <NoData>The last 30 days didn't load. Refresh the page to try again.</NoData>
</div>
{/snippet}

<style>
b {
  font-weight: var(--font-weight-headings);
}

/* Flex drops the spaces between the parts, as OG's markup had none. */
.totals {
  display: inline-flex;
  flex-wrap: wrap;
}

/* OG's dashes between the parts, hidden from screen readers. */
.part + .part::before {
  content: '—' / '';
  margin-inline: var(--space-help-dash);
  color: var(--color-help-dash);
}

.plays {
  color: var(--color-help-plays);
}

/* the panel fades in when its data lands, as OG's lazy panels did. */
.charts {
  padding-block-start: var(--gutter);
  animation: fade-in var(--transition-card) ease-out;
}

/* OG's `#charts-wrapper .row > div`. */
.block {
  padding-block-end: var(--gutter);
}

/* OG's dashboard bars kept the full 70px over them, not the profile's `less-top`. */
.genres {
  --genre-bars-padding: var(--genre-bars-padding-dashboard);
}

.notice {
  padding-block: var(--gutter);
}

/* On phones each part takes its own line, as OG's `br.visible-xs` did, and loses its dash. */
@media (width < 768px) {
  .totals {
    flex-direction: column;
  }

  .part + .part::before {
    content: none;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .charts {
    animation: none;
  }
}
</style>
