<!--
  One Upcoming Schedule day: "Today Sep 30" over its entries. A `wide` day (the first two) puts a poster column on
  the left with one poster per show, stacked; the first shows until an entry is hovered or focused, which brings up
  that entry's poster instead.
-->
<script lang="ts">
import type { ScheduleDay } from '$lib/dashboard/ScheduleDay';
import type { ScheduleItem } from '$lib/dashboard/ScheduleItem';
import posterPlaceholder from '$lib/assets/placeholders/poster.png';
import ScheduleEntry from './ScheduleEntry.svelte';

interface Props {
  day: ScheduleDay;
  wide?: boolean;
  onwatchnow: (watchNow: NonNullable<ScheduleItem['watchNow']>) => void;
}

const { day, wide = false, onwatchnow }: Props = $props();

// Each show once, in the order it first airs that day.
const posters = $derived(day.items.filter((item, i) => day.items.findIndex(({ group }) => group === item.group) === i));
let hovered = $state<string>();
const active = $derived(hovered ?? day.items.at(0)?.group);
</script>

<div class={['day', { wide }]}>
  <h3><strong>{day.relative}</strong> {day.short}</h3>
  <div class="body">
    {#if wide}
      <div class="posters">
        {#each posters as poster (poster.group)}
          <img class={['poster', { shown: poster.group === active }]} src={poster.poster ?? posterPlaceholder} alt=""
            loading="lazy" decoding="async" />
        {/each}
      </div>
    {/if}
    <div class="entries">
      {#each day.items as item, i (item.key)}
        <ScheduleEntry {item} first={i === 0} {onwatchnow} onactivate={() => (hovered = item.group)} />
      {/each}
    </div>
  </div>
</div>

<style>
h3 {
  margin: 0 0 var(--space-schedule-day);
  font-size: var(--font-size-schedule-day);
  text-transform: uppercase;
}

.wide .body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gutter);
  align-items: start;
}

.posters {
  display: grid;

  @media (width < 768px) {
    display: none;
  }
}

.poster {
  grid-area: 1 / 1;
  inline-size: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--transition-card);

  &.shown {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}

@media (768px <= width < 992px) {
  .wide .body {
    grid-template-columns: 1fr 2fr;
  }
}

@media (width < 768px) {
  .wide .body {
    display: block;
  }
}
</style>
