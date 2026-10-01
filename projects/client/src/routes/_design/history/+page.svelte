<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import WatchPopover from '$lib/components/history/WatchPopover.svelte';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import { toast } from '$lib/components/toast/toast.svelte';

const dates = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const examples = [
  { label: 'Add to history', mode: 'date', fill: 0 },
  { label: '3 plays', mode: 'remove', fill: 1 },
  { label: '50% watched', mode: 'partial', fill: 0.5 },
] as const;
</script>

<svelte:head>
  <title>History controls · og design system</title>
</svelte:head>
<Container>
  <section>
    <h1>History controls</h1>
    <p>Summary buttons and poster quick icons share the same date, remove and remaining popovers.</p>
    {#each examples as example (example.mode)}
      <h2>{example.mode}</h2>
      <div class="example">
        <WatchPopover label={example.label} variant="summary" fill={example.fill} plural={example.mode === 'partial'}
          datePreferences={dates} onopen={(force) => Promise.resolve(force ? 'date' : example.mode)}
          onwatch={(at) => toast.success(at === null ? 'Removed all plays.' : `Added play: ${at}`)}
          onremaining={() => Promise.resolve(false)} oninvalid={() => toast.error('Invalid date format, please use the date picker.')}>
          {#snippet trigger()}<Icon svg={check} /> {example.label}{/snippet}
        </WatchPopover>
      </div>
    {/each}
    <h2>Poster icon</h2>
    <WatchPopover label="Add to watched history" datePreferences={dates} onopen={() => Promise.resolve('date')}
      onwatch={(at) => toast.success(`Added play: ${at}`)} onremaining={() => Promise.resolve(false)}
      oninvalid={() => toast.error('Invalid date format, please use the date picker.')}>
      {#snippet trigger()}<Icon svg={check} />{/snippet}
    </WatchPopover>
  </section>
</Container>
<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
.example {
  max-inline-size: var(--watch-date-width);
}
</style>
