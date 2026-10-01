<!--
  One day of plays under OG's divider (`users.js:680-730`): a clock, the weekday in bold and the date, with the
  day's runtime on the right. The heading is a button that collapses or expands the day's cards. With `divider` off
  (the Toggle Dividers icon), only the cards show.
    <DayGroup weekday="Tuesday" date="September 29, 2026" runtime="2h 19m">...cards...</DayGroup>
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import clock from '$lib/icons/thin/clock.svg?raw';
import type { Snippet } from 'svelte';

interface Props {
  weekday?: string;
  date: string;
  runtime?: string;
  divider?: boolean;
  children: Snippet;
}

const { weekday, date, runtime, divider = true, children }: Props = $props();
let open = $state(true);
</script>

<div class="day">
  {#if divider}
    <h2 class="divider">
      <button type="button" aria-expanded={open} onclick={() => (open = !open)}>
        <span class="icon"><Icon svg={clock} /></span>{#if weekday}<b>{weekday}</b>{/if} {date}
      </button>
      {#if runtime}<span class="runtime">{runtime}</span>{/if}
    </h2>
  {/if}
  {#if open || !divider}{@render children()}{/if}
</div>

<style>
.divider {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-block-end: 2px;
  border-block-end: 1px solid var(--color-separator);

  & button {
    min-block-size: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
  }
}

.icon {
  margin-inline-end: 10px;

  & :global(.icon) {
    vertical-align: top;
  }
}

.runtime {
  color: var(--color-day-divider-runtime);
  font-size: var(--font-size-day-divider-runtime);
}
</style>
