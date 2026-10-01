<!--
  The dashboard's Upcoming Schedule panel: the first five days
  from the start day with anything on the viewer's calendars, the first two wide with their posters and the next three
  narrow (hidden below desktop width). Pass the unawaited `fetchSchedule` promise from the loader, so the page streams
  in and this panel spins until it lands, and fails on its own if it doesn't.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import WatchNowDialog from '$lib/components/watchnow/WatchNowDialog.svelte';
import type { DashboardSettings } from '$lib/dashboard/DashboardSettings';
import type { ScheduleDay } from '$lib/dashboard/ScheduleDay';
import type { ScheduleItem } from '$lib/dashboard/ScheduleItem';
import Icon from '$lib/icons/Icon.svelte';
import calendarClock from '$lib/icons/thin/calendar-clock.svg?raw';
import calendarLines from '$lib/icons/thin/calendar-lines.svg?raw';
import DashboardPanel from './DashboardPanel.svelte';
import ScheduleDayColumn from './ScheduleDayColumn.svelte';

interface Props {
  schedule: Promise<readonly ScheduleDay[]>;
  /** The filter, for the help line and the Calendar link. Left out, OG's Shows & Movies. */
  filter?: DashboardSettings['schedule']['filter'];
}

const { schedule, filter = 'shows-movies' }: Props = $props();

// OG printed the raw filter value; og says what it means.
const FILTER_NAMES: Readonly<Record<NonNullable<Props['filter']>, string>> = {
  'shows-movies': 'shows',
  shows: 'shows',
  premieres: 'premieres',
  'new-shows': 'new shows',
  finales: 'finales',
};

let watching = $state<NonNullable<ScheduleItem['watchNow']>>();
let open = $state(false);

function watchNow(item: NonNullable<ScheduleItem['watchNow']>) {
  watching = item;
  open = true;
}
</script>

<!-- The settings page isn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet panel(loading: boolean, content: Snippet, empty = false)}
  <DashboardPanel
  --panel-bg="var(--color-schedule-bg)"
  --panel-padding-end="calc(var(--gutter) + var(--space-lg-block))"
  --panel-min-height={empty ? 'auto' : 'var(--schedule-min-height)'}
  title="Upcoming Schedule"
  icon={calendarLines}
  {loading}
  seeMore={{ href: `/calendars/my/${filter}`, text: 'Calendar' }}
  customizeHref="/settings#dashboard"
  {feeds}
>
    {#snippet help()}All of your {FILTER_NAMES[filter]} + movies on your watchlist.{/snippet}
    {@render content()}
  </DashboardPanel>
{/snippet}

{#snippet feeds()}
  <Tooltip text="Notifications">
    {#snippet trigger(tooltip)}
      <a class="feed-icon" href="/settings/notifications" aria-label="Notifications" {...tooltip}>
        <Icon svg={calendarClock} />
      </a>
    {/snippet}
  </Tooltip>
{/snippet}

{#await schedule}
  {@render panel(true, pending)}
{:then days}
  {#snippet columns()}
    {#if days.length === 0}
      <div class="notice">
  <NoData>
          Add some TV shows and movies to your watched history, collection, or watchlist and they'll show up here.
        </NoData>
</div>
    {:else}
      <div class="schedule">
  <div class="wide">
          {#each days.slice(0, 2) as day (day.date)}
            <ScheduleDayColumn {day} wide onwatchnow={watchNow} />
          {/each}
        </div>
  {#if days.length > 2}
          <div class="narrow">
            {#each days.slice(2, 5) as day (day.date)}
              <ScheduleDayColumn {day} onwatchnow={watchNow} />
            {/each}
          </div>
        {/if}
</div>
    {/if}
  {/snippet}
  {@render panel(false, columns, days.length === 0)}
{:catch}
  {@render panel(false, failed)}
{/await}

{#if watching}
  {#key watching}
    <WatchNowDialog bind:open button={watching.button} title={watching.title} year={watching.year}
  fanart={watching.fanart} />
  {/key}
{/if}

{#snippet pending()}{/snippet}

{#snippet failed()}
  <div class="notice">
  <NoData>The schedule didn't load. Refresh the page to try again.</NoData>
</div>
{/snippet}

<style>
/* OG's alert sat in a row, which kept 20px above it. */
.notice {
  padding-block-start: var(--gutter);
  --color-no-data-bg: var(--color-schedule-no-data-bg);
}

.feed-icon {
  color: var(--color-feed-icon);
  font-size: var(--font-size-h2);
  line-height: 1;
  transition: color var(--transition-card);

  &:is(:hover, :focus-visible) {
    color: var(--color-feed-icon-hover);
  }
}

/* OG's twelve-column row: the two wide days take seven, the three narrow ones five. */
.schedule {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--gutter);
  padding-block-start: var(--gutter);
  animation: fade-in var(--transition-card) ease-out;
}

.wide,
.narrow {
  display: grid;
  gap: var(--gutter);
  align-items: start;
}

.wide {
  grid-column: span 7;
  grid-template-columns: 1fr 1fr;
}

.narrow {
  grid-column: span 5;
  grid-template-columns: repeat(3, 1fr);
}

@media (width < 992px) {
  .wide {
    grid-column: 1 / -1;
  }

  .narrow {
    display: none;
  }
}

@media (width < 768px) {
  .wide {
    grid-template-columns: 1fr;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .schedule {
    animation: none;
  }
}
</style>
