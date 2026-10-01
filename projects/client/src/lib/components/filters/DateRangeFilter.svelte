<!--
  OG's date range (`.btn-date-range`, `global.js:2922-3021`): a calendar icon, red while a range is set, that opens
  a popover with Start Date and End Date pickers, a check that reloads with `start_at` and `end_at`, and an x that
  clears them. While a range is set, a two-line chip beside it reads the label over "Sep 1, 2026 → Sep 10, 2026",
  or "→ present" with no end. The pickers are native datetime-local inputs in the viewer's zone.
    <DateRangeFilter start={filters.startAt} end={filters.endAt} label="Watched At" {datePreferences} />
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { watchDateInput } from '$lib/components/history/watchDateInput';
import { watchDateInstant } from '$lib/components/history/watchDateInstant';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import calendar from '$lib/icons/thin/calendar-lines.svg?raw';
import arrowRight from '$lib/icons/trakt/arrow-right.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import close from '$lib/icons/trakt/delete-thick.svg?raw';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { formatDate } from '$lib/utils/formatDate';

interface Props {
  /** UTC instants. */
  start?: string;
  end?: string;
  /** The chip's first line: "Watched At", "Collected At". */
  label: string;
  datePreferences: DatePreferences;
}

const { start, end, label, datePreferences }: Props = $props();
const id = $props.id();
let popover = $state<HTMLDivElement>();
let button = $state<HTMLButtonElement>();
let from = $state('');
let to = $state('');
let maximum = $state('');

const day = (at: string) => formatDate(at, { ...datePreferences, format: 'll' });
// OG left the end off when it fell on the start's day.
const sameDay = $derived(
  start && end && watchDateInput(new Date(end), datePreferences.timeZone).slice(0, 10) <=
      watchDateInput(new Date(start), datePreferences.timeZone).slice(0, 10),
);

function toggle(event: ToggleEvent) {
  if (event.newState !== 'open') {
    button?.focus({ preventScroll: true });
    return;
  }
  const now = new Date();
  maximum = watchDateInput(now, datePreferences.timeZone);
  from = watchDateInput(start ? new Date(start) : now, datePreferences.timeZone);
  to = watchDateInput(end ? new Date(end) : now, datePreferences.timeZone);
  popover?.querySelector('input')?.focus();
}

function reload(range: { start_at: string; end_at: string } | null) {
  const url = new URL(page.url);
  for (const key of ['start_at', 'end_at', 'days', 'page']) url.searchParams.delete(key);
  if (range) { for (const [key, value] of Object.entries(range)) url.searchParams.set(key, value); }
  popover?.hidePopover();
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page with a new query string
  void goto(url);
}

function apply(event: SubmitEvent) {
  event.preventDefault();
  const start_at = watchDateInstant(from, datePreferences.timeZone);
  const end_at = watchDateInstant(to, datePreferences.timeZone);
  if (start_at && end_at) reload({ start_at, end_at });
}
</script>

<span class="date-range" style:anchor-name="--date-range-{id}">
  <Tooltip text="Date Range">
    {#snippet trigger(tooltip)}
      <button bind:this={button} type="button" class={['launcher', { selected: start }]} aria-label="Date range"
        popovertarget="date-range-{id}" {...tooltip}>
        <Icon svg={calendar} /><span class="caret"></span>
      </button>
    {/snippet}
  </Tooltip>
  <div bind:this={popover} id="date-range-{id}" class="popover" popover="auto" role="dialog" aria-label="Date range"
    style:position-anchor="--date-range-{id}" ontoggle={toggle}>
    <form onsubmit={apply}>
      <label>
        <span class="title">Start Date</span>
        <input type="datetime-local" bind:value={from} max={maximum} required />
      </label>
      <label>
        <span class="title">End Date</span>
        <input type="datetime-local" bind:value={to} min={from} max={maximum} required />
      </label>
      <div class="buttons">
        <button type="submit" class="yes"><Icon svg={check} label="Apply date range" /></button>
        <button type="button" class="no" onclick={() => reload(null)}>
          <Icon svg={close} label="Clear date range" />
        </button>
      </div>
    </form>
  </div>
</span>
{#if start}
  <span class="chip">
  <strong>{label}</strong>
  <span>
      {day(start)}
      {#if !end}<span class="arrow"><Icon svg={arrowRight} /></span>present{:else if !sameDay}<span class="arrow"
        ><Icon svg={arrowRight} /></span>{day(end)}{/if}
    </span>
</span>
{/if}

<style>
.date-range {
  display: inline-block;
}

.launcher {
  display: inline-flex;
  align-items: center;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-filter-icon);
  font-size: var(--font-size-date-range-icon);
  line-height: 1;
  transition: color 0.5s;

  &.selected {
    color: var(--brand-primary);
  }
}

.caret {
  margin: 3px 0 0 5px;
  border-block-start: 4px solid;
  border-inline: 4px solid transparent;
}

.popover {
  position: fixed;
  position-area: bottom span-right;
  position-try-fallbacks: flip-inline;
  inset: auto;
  margin: var(--watch-popover-gap) 0 0;
  padding: 0;
  border: var(--rating-popover-border-width) solid var(--color-dropdown-border);
  border-radius: var(--radius-base);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-dropdown);
  font: var(--font-size-base) / var(--line-height-base) var(--font-body);
}

form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: var(--date-range-gap);
  align-items: end;
  padding: var(--date-range-padding);
}

label {
  display: grid;
  gap: 2px;
}

.title {
  color: var(--color-date-range-title);
  font-family: var(--font-headings);
  font-size: var(--font-size-date-range-title);
  text-transform: uppercase;
}

.buttons {
  display: flex;
  gap: 4px;
  padding-block-end: 6px;

  & button {
    min-block-size: 0;
    padding: 0;
    border: 0;
    background: none;
    font-size: var(--font-size-date-range-button);
    line-height: 1;
  }
}

.yes {
  color: var(--brand-success);
}

.no {
  color: var(--brand-danger);
}

.chip {
  display: inline-grid;
  color: var(--color-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-date-range-chip);
  line-height: 1.3;
  text-transform: uppercase;

  & strong {
    font-weight: var(--font-weight-headings-heavy);
  }
}

.arrow {
  margin-inline: 5px;
  color: var(--color-text-muted);
}
</style>
